# 7.5.4 调度器及扩展设计

Kubernetes 的设计思想是足够地开放，这种思想也体现在调度逻辑上。

Kubernetes 从 v1.15 版本起，为 kube-scheduler 设计了可插拔的调度框架（Scheduling Framework）。有了 Scheduling Framework，在保持调度“核心”简单且可维护的同时，用户可以编写自己的调度插件注册到 Scheduling Framework 的扩展点来实现自己想要的调度逻辑。

如下图，现实了 Pod 的调度上下文以及调度框架公开的扩展点。
:::center
  ![](../assets/scheduling-framework-extensions.png)<br/>
   Kubernetes 调度框架
:::


一个 Pod 完整调度过程可以分为两个阶段 ：scheduling cycle（调度周期）和 binding cycle（绑定周期）。

- scheduling cycle 主要职责是为 Pod 选择一个 node，类似于数据库查询和筛选。去除那些不符合要求的节点后，剩余节点根据给定的分数进行排名，最后选择一个得分最高的节点。这些步骤被称为过滤和评分。
- binding cycle 是落实上一个阶段的选择，确保 Kubelet 在选定的节点上启动 Pod。

虽然 scheduling cycle 为 Pod 选择了一个 node，但是在接下来的 binding cycle 中， 在这个 node 上给这个 Pod 创建 persistent volume 失败了， 那整个调度过程也是算失败的，需要回到最开始的步骤重新调度。以上两个过程加起来称为一个 scheduling context（调度上下文）。


## 扩展调度插件

Pod 是原子的调度单位，这句话意味着 Kubernetes 默认调度器是以 Pod 为调度单元进行依次调度的，并不考虑 Pod 之间的关联关系。但是很多数据**计算类的离线作业具有组合调度的特点，要求所有的子任务都能够成功创建后，整个作业才能正常运行**，即所谓的 All_or_Nothing。

例如：JobA 需要 4 个 Pod 同时启动，才算正常运行。kube-scheduler 依次调度 3 个 Pod 并创建成功，到第 4 个 Pod 时，集群资源不足，则 JobA 的 3 个 Pod 处于空等的状态。但是它们已经占用了部分资源，如果第 4 个 Pod 不能及时启动的话，整个 JobA 无法成功运行，更糟糕的集群其他的资源刚好被 JobB 的 3 个 Pod 所占用，同时在等待 JobB 的第 4 个 Pod 创建，此时整个集群就出现了死锁。

**解决以上问题的思想是将调度单元从 Pod 修改为 PodGroup，以组的形式进行调度，实现「Gang Scheduling」**。

最开始是社区催化 kube-batch，能够将一个训练任务的多个 Pod 当做一个整体进行调度，只有当任务所有 Pod 的资源都满足，才会将容器在节点上启动；kube-batch还提供了 Queue 的机制（其实就是多租户），不同队列之间可以设置优先级，优先级高的队列中的任务会优先得到调度。

但仅有调度器还不足以支持相应的批量计算作业，作为一个批量计算系统还需要其它很多组件的支持，例如 作业管理，数据管理，资源规划等等。后续社区中又陆续出现 Volcano、Koordinator 等一些以 Kubernetes 为基础的通用的计算系统。
虽功能上有些差异，但总体而言核心依靠最基本的 Gang Scheduling，提供主流架构的 CPU、GPU 在内的异构设备混合调度能力，再补些 MPI 等辅助功能。