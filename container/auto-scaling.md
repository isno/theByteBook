# 7.8 弹性伸缩

弹性伸缩（Auto Scaling）目标是通过解决欠配置（损失服务可用性）和过度配置（导致不必要的成本）而实现容量与成本之间博弈的平衡。

Kubernetes 弹性伸缩组件可以从伸缩方向和伸缩对象两个维度进行解读，如下表所列。

|| Pod | Node |
|:--|:--|:--|
| Vertical | Vertical Pod Autoscaler（VPA，垂直 Pod 自动伸缩器）| 无 | 
| Horizontal | Horizontal Pod Autoscaler（HPA，水平 Pod 垂直自动伸缩器）| Cluster AutoScaler | 


先来看第一个 VPA 组件，它确保工作负载适配的方式是调整 Pod 资源上限而不是水平扩展它们。但这里有一个问题：增强型的 Pod 并不一定好，大多数情况下使用多个进程处理数据远比使用一个大且强的进程更高效。

HPA 组件根据资源利用率或者自定义指标自动调整 Deployment、StatefulSet 或其他类似资源的扩展和缩减，实现部署的规模接近于实际服务的负载。HPA 最初的 v1 版本只支持 CPU 指标的伸缩，局限性明显。因为传统的指标如 CPU 或内存不一定就能代表服务的负载情况，比如事件驱动的应用程序 Kafka，传入 kafka 事件的数量才是确定负载的真实指标。在持续集成（CI）流水线中，当提交代码时，可能会触发一系列的流水线作业（镜像编译、应用打包、可用性测试），如果持续集成的作业出现瓶颈，这里的度量标准应该是等待执行的任务数，那么基于作业队列数量伸缩比仅仅观察 CPU 或者内存指标更有效。

当然，Kubernetes 也看到了这一点。HPA 在经过三个大版本的演进之后，最新的 autoscaling/v2 实现支持 Resource Metrics（资源指标，如pod的CPU）和 Custom Metrics（自定义指标）和 External Metrics（额外指标）的缩放。

## 基于事件驱动的方式

现在的 HPA 虽然能基于外部指标实现弹性伸缩，但也有一些缺点，扑面来而的复杂、不直观的配置以及仅与 Prometheus 指标关联。而 Kedify、Microsoft 开源的 KEDA（Kubernetes Event-driven Autoscaling）项目则可以简化这个过程。

KEDA 的出现并不是替代 HPA，而通过内置几十种常见的 Scaler[^1] 以及自定义 Scaler 对 HPA 增强。通过更丰富的指标，例如消息队列的排队深度、每秒请求数、调度的 Cron 作业数以及你可以想象的自定义指标，来驱动 HPA 工作负载从 0->1 和 1->0 的变化。

KEDA 由以下组件组成：

- Scaler：连接到外部组件（例如 Prometheus、RabbitMQ) 并获取指标（例如待处理消息队列大小）
- Metrics Adapter：将 Scaler 获取的指标转化成 HPA 可以使用的格式并传递给 HPA
- Controller：负责创建和更新一个 HPA 对象，并负责扩缩到零
- keda operator：负责创建维护 HPA 对象资源，同时激活和停止 HPA 伸缩。在无事件的时候将副本数降低为 0 (如果未设置 minReplicaCount 的话)
- metrics server: 实现了 HPA 中 external metrics，根据事件源配置返回计算结果。

<div  align="center">
  <img src="../assets/keda-arch.png" width = "400"  align=center />
</div>


## Cluster AutoScaler

集群可用资源变多，不等于整体开支降低。集群节点的弹性伸缩本来是一件非常麻烦的事情，好在现在的集群大多都是构建在云上，云上可以直接调用接口添加删除节点，这就使得集群节点弹性伸缩变得非常方便。

Cluster AutoScaler 是一个自动扩展和收缩 Kubernetes 集群 Node 的扩展。当集群容量不足时，它会自动去 Cloud Provider（支持绝大部分的云服务商 GCE、GKE、Azure、AKS、AWS 等等）创建新的 Node，而在 Node 长时间（超过 10 分钟）资源利用率很低时（低于 50%）自动 Pod 会自动调度到其他 Node 上面，并删除节点以节省开支。

<div  align="center">
  <img src="../assets/Cluster-AutoScaler.png" width = "500"  align=center />
</div>

Cluster Autoscaler 虽然是 Kubernetes 官方标准，但是由于他深度依赖公有云厂商，因此具体使用方法，功能以及限制以公有云厂商具体实现为准。

[^1]: 参见 https://keda.sh/docs/2.12/scalers/
[^2]: 参见 https://keda.sh/community/#end-users

