# 7.5.5 调度插件 

Kubernetes 默认调度器是以 Pod 为调度单元进行依次调度的，并不考虑 Pod 之间的关联关系。但是很多数据**计算类的离线作业具有组合调度的特点，要求所有的子任务都能够成功创建后，整个作业才能正常运行**，即所谓的 All_or_Nothing。

例如：JobA 需要 4 个 Pod 同时启动，才算正常运行。kube-scheduler 依次调度 3 个 Pod 并创建成功，到第 4 个 Pod 时，集群资源不足，则 JobA 的 3 个 Pod 处于空等的状态。但是它们已经占用了部分资源，如果第 4 个 Pod 不能及时启动的话，整个 JobA 无法成功运行，更糟糕的集群其他的资源刚好被 JobB 的 3 个 Pod 所占用，同时在等待 JobB 的第 4 个 Pod 创建，此时整个集群就出现了死锁。

**解决以上问题的思想是将调度单元从 Pod 修改为 PodGroup，以组的形式进行调度，实现「Gang Scheduling」**。Kubernetes 1.16 版本开始, 构建了一种新的调度框架 Kubernetes Scheduling Framework，核心思想是原有调度过程中的每个环节都尽可能插件化，开发者通过在扩展点注册插件，从而实现自己的容器调度逻辑。

:::center
  ![](../assets/scheduling-framework-extensions.png)<br/>
   Pod 调度流程和调度框架公开的扩展点
:::

最开始是社区催化 kube-batch，能够将一个训练任务的多个 Pod 当做一个整体进行调度，只有当任务所有 Pod 的资源都满足，才会将容器在节点上启动；kube-batch还提供了 Queue 的机制（其实就是多租户），不同队列之间可以设置优先级，优先级高的队列中的任务会优先得到调度。

通过 list-watch 监听 Pod, Queue, PodGroup 和 Node 等资源，在本地维护一份集群资源的全局缓存，依次通过如下的策略（reclaim, allocate, preemption，predict） 完成资源的调度


但仅有调度器还不足以支持相应的批量计算作业，作为一个批量计算系统还需要其它很多组件的支持，例如 作业管理，数据管理，资源规划等等。后续社区中又陆续出现 Volcano、Koordinator 等一些以 Kubernetes 为基础的通用的计算系统。虽功能上有些差异，但总体而言核心依靠最基本的 Gang Scheduling，提供主流架构的 CPU、GPU 在内的异构设备混合调度能力，再补些 MPI 等辅助功能。


:::center
  ![](../assets/what-is-koordinator.svg)<br/>
 Koordinator 概述
:::