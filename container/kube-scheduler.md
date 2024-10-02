# 7.7.3 调度器及扩展设计

如果集群只有几十个节点，为新创建的 Pod 找到最合适的节点并不困难，但当节点规模达到几千甚至更大时，情况就复杂得多。

首先，Pod 的创建/更新和节点资源无时无刻不在发生变化，如果每次调度都需要进行数千次远程请求以获取相关信息，会因耗时过长，导致调度失败。其次，调度器频繁的网络请求会使其成为集群的性能瓶颈。

:::tip <a/>
为了充分利用硬件资源，通常会将各种类型(CPU 密集、IO 密集、批量处理、低延迟作业)的 workloads 运行在同一台机器上，这种方式减少了硬件上的投入，但也使调度问题更加复杂。

随着集群规模的增大，需要调度的任务的规模也线性增大，由于调度器的工作负载与集群大小大致成比例，调度器有成为可伸缩性瓶颈的风险。

:::right
—— from Omega 论文
:::

Omega 论文中提出了一种基于共享状态（图 7-1 中的 Scheduler Cache）的双循环调度机制，用来解决大规模集群的调度效率问题。双循环的调度机制不仅应用在 Google 的 Omega 系统中，也被 Kubernetes 继承下来。

Kubernetes 默认调度器（kube-scheduler）双循环调度机制如图 7-31 所示。

:::center
  ![](../assets/kube-scheduler.svg)<br/>
  图 7-37 默认调度器 kube-scheduler 的双循环调度机制
:::

从图 7-37 可以看出，Kubernetes 调度的核心就是两个互相独立的控制循环。

第一个控制循环称为 Informer 循环。该循环的主要逻辑是启动一系列 Informer 监听（Watch）API 资源（主要是 Pod 和 Node）状态的变化。当 API 资源变化时，触发 Informer 回调函数进一步处理。例如，一个待调度 Pod 被创建后，触发 Pod Informer 回调函数，该回调函数将 Pod 入队到调度队列中（PriorityQueue），待下一阶段处理。

此外，当 API 资源变化时，Informer 的回调函数还承担对调度器缓存（即 Scheduler Cache）更新的责任，该操作的目的是尽可能将 Pod、Node 的信息缓存化，以便提升后续阶段调度算法的执行效率。

第二个控制循环称为 Scheduling 循环。该循环主要逻辑是不断地从调度队列（PriorityQueue）中出队一个 Pod。然后，触发两个最核心的调度阶段：过滤阶段（也称为预选阶段，图 7-31 中的 Predicates）和打分阶段（也称为优选阶段，图 7-31 中的 Priority）。

- 过滤阶段：该阶段主要是调用过滤插件（稍后介绍）筛选出符合 Pod 要求的 Node 节点集合。当然，该阶段所有的信息都是从 Scheduler Cache 获取的。 Kubernetes 的调度器内置了一批过滤插件，总结它们的过滤策略如下：
  - 资源过滤策略：检查节点资源是否满足 Pod 请求（request），在节点之间平衡资源分配。
  - 节点过滤策略：与宿主机节点相关的策略。例如检查 Pod 是否能容忍节点的污点；确保 Pod 调度到符合亲和性条件的节点；
  - 拓扑和亲和性策略：该策略主要处理 Pod 之间的亲和性规则，还有确保 Pod 在不同节点间均匀分布。

过滤阶段执行完毕之后，得到一个可供 Pod 调度的所有节点列表。如果这个列表是空的，代表这个 Pod 不可调度。过滤阶段至此结束，接着进入打分阶段。

打分阶段的目的是对过滤阶段接到的节点进行排序，选择最佳节点来运行 Pod。打分逻辑由一系列的评分插件（Score Plugins）组成，这些插件根据预定的规则为每个节点分配一个分数。调度器最终会选择分数最高的节点来调度 Pod。如果存在多个节点分数相同，调度器会随机选择其中一个。



Kubernetes 从 v1.15 版本起，为默认调度器（kube-scheduler）设计了可扩展的机制 —— Scheduling Framework。这个设计的主要目的，是在调度器生命周期的关键点上（图中绿色矩形箭头框），向用户暴露可以扩展和实现自定义调度逻辑的接口。

:::center
  ![](../assets/scheduling-framework-extensions.svg)<br/>
   图 7-38 Pod 的调度上下文以及调度框架公开的扩展点
:::

有了 Scheduling Framework，在保持调度“核心”简单且可维护的同时，用户只要编写自己的调度插件注册到 Scheduling Framework 的扩展点就能实现自己想要的调度逻辑。笔者列举部分扩展点，供你参考：

- sort：这些插件对调度队列中的悬决的 Pod 排序。一次只能启用一个队列排序插件。
- preFilter：这些插件用于在过滤之前预处理或检查 Pod 或集群的信息。它们可以将 Pod 标记为不可调度。
- filter：这些插件相当于调度策略中的断言（Predicates），用于过滤不能运行 Pod 的节点。 过滤器的调用顺序是可配置的。 如果没有一个节点通过所有过滤器的筛选，Pod 将会被标记为不可调度。
- postFilter：当无法为 Pod 找到可用节点时，按照这些插件的配置顺序调用他们。 如果任何 postFilter 插件将 Pod 标记为可调度，则不会调用其余插件。
- preScore：这是一个信息扩展点，可用于预打分工作。
- score：这些插件给通过筛选阶段的节点打分。调度器会选择得分最高的节点。




值得注意的是，Scheduling Framework 属于 Kubernetes 内部扩展机制，需要按照规范编写 Golang 代码。

在上述两个阶段结束之后，调度器 kube-scheduler 会将就需要将 Pod 对象的 nodeName 字段的值，修改为选中 Node 的名字，这个过程在 Kubernetes 里面被称作 Bind。为了不在关键调度路径里远程访问 API Server，Kubernetes 默认调度器在 Bind 阶段只会更新 Scheduler Cache 里的 Pod 和 Node 的信息。这种基于“乐观”假设的 API 对象更新方式，在 Kubernetes 里被称作 Assume。Assume 之后，调度器才会创建一个 Goroutine 异步地向 API Server 发起更新 Pod 的请求，kubelet 完成真正调度操作。
