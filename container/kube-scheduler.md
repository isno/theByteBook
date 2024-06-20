# 7.7.4 调度器及扩展设计

调度器主要的职责是为一个新创建出来的 Pod，寻找一个最合适的节点。如果只是几十个节点的规模中，这肯定不是什么困难的事情，但几千个节点或者更大规模的集群呢？

Pod 创建/更新以及节点资源无时无刻不在变化，如果每次调度需要数千次远程访问获取这些信息，不仅会耗时过长（时间长了，信息就失效了）造成调度失败，调度器密集的请求还会导致本身成为集群的性能瓶颈。

:::tip <a/>
为了充分利用硬件资源，通常会将各种类型(CPU 密集、IO 密集、批量处理、低延迟作业)的 workloads 运行在同一台机器上，这种方式减少了硬件上的投入，但也使调度问题更加复杂。

随着集群规模的增大，需要调度的任务的规模也线性增大，由于调度器的工作负载与集群大小大致成比例，调度器有成为可伸缩性瓶颈的风险。

:::right
—— from Omega 论文
:::

## 1. kube-scheduler 双循环架构

Omega 的论文中提出了一种基于共享状态（图 7-1 中的 Scheduler Cache）的双循环调度机制，用来解决大规模集群的调度效率问题，这种调度机制不仅应用在 Google 的 Omega 系统中，也被 Kubernetes 继承下来。

Kubernetes 默认调度器（kube-scheduler）双循环架构如下所示。

:::center
  ![](../assets/kube-scheduler.png)<br/>
  图 7-1 kube-scheduler 双循环架构设计
:::

第一个控制循环称之为 Informer Path，它主要目的是启动一系列 Informer 监听（Watch）Etcd 中 Pod、Node、Service 等与调度相关的 API 对象的变化。譬如一个待调度 Pod 被创建后，调度器就会通过 Pod Informer 的 Handler 将这个待调度 Pod 添加进调度队列。

Kubernetes 的调度器还要负责对调度器缓存（即 Scheduler Cache）进行更新，缓存的目的主要是对调度部分进行性能优化，将集群信息 cache 化，以便提升 Predicate 和 Priority 调度算法的执行效率。

第二个控制循环，是调度器负责 Pod 调度的主循环，被称之为 Scheduling Path。

Scheduling Path 主要逻辑是不断地从调度队列里出队一个 Pod。然后调用 Predicates 算法对所有的 Node 进行“过滤”。“过滤”得到的一组可以运行这个 Pod 的 Node 列表。当然，Predicates 算法需要的 Node 信息，也都是 Scheduler Cache 里直接拿到的，这是调度器保证算法执行效率的主要手段之一。

接下来，调度器就会再调用 Priorities 算法为上述列表里的 Node 打分，得分最高的 Node 就会作为这次调度的结果。

调度算法执行完成后，调度器就需要将 Pod 对象的 nodeName 字段的值，修改为上述 Node 的名字，这个过程在 Kubernetes 里面被称作 Bind。为了不在关键调度路径里远程访问 API Server，Kubernetes 默认调度器在 Bind 阶段只会更新 Scheduler Cache 里的 Pod 和 Node 的信息。这种基于“乐观”假设的 API 对象更新方式，在 Kubernetes 里被称作 Assume。Assume 之后，调度器才会创建一个 Goroutine 异步地向 API Server 发起更新 Pod 的请求，完成真正 Bind 操作。

Kubernetes 调度器的上述设计思想，也是在集群规模不断增长的演进过程中逐步实现的。尤其是 “Cache 化”设计，是最近几年 Kubernetes 调度器性能提升的一个关键演化。

## 2. 调度器可扩展设计

“Pod 是原子的调度单位”这句话的含义是 kube-scheduler 以 Pod 为调度单元进行依次调度，并不考虑 Pod 之间的关联关系。

但是很多数据**计算类的离线作业具有组合调度的特点，要求所有的子任务都能够成功创建后，整个作业才能正常运行**，即所谓的 All_or_Nothing。

例如：JobA 需要 4 个 Pod 同时启动，才算正常运行。kube-scheduler 依次调度 3 个 Pod 并创建成功，到第 4 个 Pod 时，集群资源不足，则 JobA 的 3 个 Pod 处于空等的状态。但是它们已经占用了部分资源，如果第 4 个 Pod 不能及时启动的话，整个 JobA 无法成功运行，更糟糕的集群其他的资源刚好被 JobB 的 3 个 Pod 所占用，同时在等待 JobB 的第 4 个 Pod 创建，此时整个集群就出现了死锁。

**解决以上问题的思想是将调度单元从 Pod 修改为 PodGroup，以组的形式进行调度，实现“Gang Scheduling”**。

Kubernetes 从 v1.15 版本起，为 kube-scheduler 设计了可插拔的扩展机制 —— Scheduling Framework。
:::center
  ![](../assets/scheduling-framework-extensions.png)<br/>
   Pod 的调度上下文以及调度框架公开的扩展点
:::

有了 Scheduling Framework，在保持调度“核心”简单且可维护的同时，用户可以编写自己的调度插件注册到 Scheduling Framework 的扩展点来实现自己想要的调度逻辑。

最开始是社区催化 kube-batch，能够将一个训练任务的多个 Pod 当做一个整体进行调度，只有当任务所有 Pod 的资源都满足，才会将容器在节点上启动；kube-batch 还提供了 Queue 的机制（其实就是多租户），不同队列之间可以设置优先级，优先级高的队列中的任务会优先得到调度。

但仅有调度器还不足以支持相应的批量计算作业，作为一个批量计算系统还需要其它很多组件的支持，例如 作业管理，数据管理，资源规划等等。

后续社区中又陆续出现 Volcano、Koordinator 项目，这些项目虽然功能上有些差异，但总体而言核心依靠基本的 Gang Scheduling，提供主流架构的 CPU、GPU 在内的异构设备混合调度能力，再补齐 MPI 等辅助功能，最终构造出以 Kubernetes 为基础的通用的计算系统/平台。
