# 7.5.4 调度器及扩展设计

:::tip <a/>
为了充分利用硬件资源，通常会将各种类型(CPU 密集、IO 密集、批量处理、低延迟作业)的 workloads 运行在同一台机器上，这种方式减少了硬件上的投入，但也使调度问题更加复杂。

随着集群规模的增大，需要调度的任务的规模也线性增大，由于调度器的工作负载与集群大小大致成比例，调度器有成为可伸缩性瓶颈的风险。

:::right
—— from Omega 论文

:::

kube-scheduler 的根本工作任务是根据各种调度算法将Pod绑定（bind）到最合适的工作节点，整个调度流程分为两个阶段：预选策略（Predicates）和优选策略（Priorities）。

- 预选（Predicates）：输入是所有节点，输出是满足预选条件的节点。kube-scheduler根据预选策略过滤掉不满足策略的Nodes。例如，如果某节点的资源不足或者不满足预选策略的条件如“Node的label必须与Pod的Selector一致”时则无法通过预选。
- 优选（Priorities）：输入是预选阶段筛选出的节点，优选会根据优先策略为通过预选的Nodes进行打分排名，选择得分最高的Node。例如，资源越富裕、负载越小的Node可能具有越高的排名。

通俗点说，调度的过程就是在回答两个问题：1. 候选有哪些？2. 其中最适合的是哪个？

值得一提的是，如果在预选阶段没有节点满足条件，Pod会一直处在Pending状态直到出现满足的节点，在此期间调度器会不断的进行重试。

k8s默认调度器的整体工作框架，可以简单用下图概括：

:::center
  ![](../assets/kube-scheduler.png)<br/>
  图 7-1 kube-scheduler 组件概览
:::

- 第一个控制循环，我们可以称之为 Informer Path。它的主要目的，是启动一系列 Informer，用来监听（Watch）Etcd 中 Pod、Node、Service 等与调度相关的 API 对象的变化。比如，当一个待调度 Pod（即：它的 nodeName 字段是空的）被创建出来之后，调度器就会通过 Pod Informer 的 Handler，将这个待调度 Pod 添加进调度队列。此外，Kubernetes 的默认调度器还要负责对调度器缓存（即：scheduler cache）进行更新，缓存的目的主要是对调度部分进行性能优化，将集群信息 cache 化，以便提升 Predicate 和 Priority 调度算法的执行效率。

- 第二个控制循环，是调度器负责 Pod 调度的主循环，我们可以称之为 Scheduling Path。Scheduling Path 的主要逻辑，就是不断地从调度队列里出队一个 Pod。然后，调用 Predicates 算法进行“过滤”。这一步“过滤”得到的一组 Node，就是所有可以运行这个 Pod 的宿主机列表。当然，Predicates 算法需要的 Node 信息，都是从 Scheduler Cache 里直接拿到的，这是调度器保证算法执行效率的主要手段之一。接下来，调度器就会再调用 Priorities 算法为上述列表里的 Node 打分，分数从 0 到 10。得分最高的 Node，就会作为这次调度的结果。


调度算法执行完成后，调度器就需要将 Pod 对象的 nodeName 字段的值，修改为上述 Node 的名字。这个步骤在 Kubernetes 里面被称作 Bind。但是，为了不在关键调度路径里远程访问 APIServer，Kubernetes 的默认调度器在 Bind 阶段，只会更新 Scheduler Cache 里的 Pod 和 Node 的信息。这种基于“乐观”假设的 API 对象更新方式，在 Kubernetes 里被称作 Assume。Assume 之后，调度器才会创建一个 Goroutine 来异步地向 APIServer 发起更新 Pod 的请求，来真正完成 Bind 操作。


除了上述的“Cache 化”和“乐观绑定”，Kubernetes 默认调度器还有一个重要的设计，那就是“无锁化”。在 Scheduling Path 上，调度器会启动多个 Goroutine 以节点为粒度并发执行 Predicates 算法，从而提高这一阶段的执行效率。而与之类似的，Priorities 算法也会以 MapReduce 的方式并行计算然后再进行汇总。而在这些所有需要并发的路径上，调度器会避免设置任何全局的竞争资源，从而免去了使用锁进行同步带来的巨大的性能损耗。所以，在这种思想的指导下，如果你再去查看一下前面的调度器原理图，你就会发现，Kubernetes 调度器只有对调度队列和 Scheduler Cache 进行操作时，才需要加锁。而这两部分操作，都不在 Scheduling Path 的算法执行路径上。

Kubernetes 调度器的上述设计思想，也是在集群规模不断增长的演进过程中逐步实现的。尤其是 “Cache 化”，这个变化其实是最近几年 Kubernetes 调度器性能得以提升的一个关键演化。


## 扩展调度插件

Pod 是原子的调度单位，这句话意味着 Kubernetes 默认调度器是以 Pod 为调度单元进行依次调度的，并不考虑 Pod 之间的关联关系。但是很多数据**计算类的离线作业具有组合调度的特点，要求所有的子任务都能够成功创建后，整个作业才能正常运行**，即所谓的 All_or_Nothing。

例如：JobA 需要 4 个 Pod 同时启动，才算正常运行。kube-scheduler 依次调度 3 个 Pod 并创建成功，到第 4 个 Pod 时，集群资源不足，则 JobA 的 3 个 Pod 处于空等的状态。但是它们已经占用了部分资源，如果第 4 个 Pod 不能及时启动的话，整个 JobA 无法成功运行，更糟糕的集群其他的资源刚好被 JobB 的 3 个 Pod 所占用，同时在等待 JobB 的第 4 个 Pod 创建，此时整个集群就出现了死锁。

**解决以上问题的思想是将调度单元从 Pod 修改为 PodGroup，以组的形式进行调度，实现「Gang Scheduling」**。Kubernetes 从 v1.15 版本起，为 kube-scheduler 设计了可插拔的调度框架（Scheduling Framework）。有了 Scheduling Framework，在保持调度“核心”简单且可维护的同时，用户可以编写自己的调度插件注册到 Scheduling Framework 的扩展点来实现自己想要的调度逻辑。


如下图，现实了 Pod 的调度上下文以及调度框架公开的扩展点。
:::center
  ![](../assets/scheduling-framework-extensions.png)<br/>
   Kubernetes 调度框架
:::

最开始是社区催化 kube-batch，能够将一个训练任务的多个 Pod 当做一个整体进行调度，只有当任务所有 Pod 的资源都满足，才会将容器在节点上启动；kube-batch 还提供了 Queue 的机制（其实就是多租户），不同队列之间可以设置优先级，优先级高的队列中的任务会优先得到调度。

但仅有调度器还不足以支持相应的批量计算作业，作为一个批量计算系统还需要其它很多组件的支持，例如 作业管理，数据管理，资源规划等等。后续社区中又陆续出现 Volcano、Koordinator 等一些以 Kubernetes 为基础的通用的计算系统。
虽功能上有些差异，但总体而言核心依靠最基本的 Gang Scheduling，提供主流架构的 CPU、GPU 在内的异构设备混合调度能力，再补些 MPI 等辅助功能。