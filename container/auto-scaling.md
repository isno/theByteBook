# 7.5.3 资源动态调整

应用的实际流量会不断变化，因此使用率也是不断变化的，为了应对应用流量的变化，我们应用能够自动调整应用的资源。譬如一个在线电子商城：
- 在促销的时候访问量会增加，我们应该自动增加服务运算能力来应对；
- 当促销结束后，又需要自动降低服务的运算能力防止浪费。

运算能力的增减有两种方式：增减 Pod 的数量以及改变单个 Pod 的资源，这两种方式分别对应了 kubernetes 的 HPA 和 VPA 组件。

## Horizontal Pod AutoScaling（横向 Pod 自动扩展）

横向 Pod 自动扩展的思路是这样的：kubernetes 会运行一个 controller，周期性地监听 pod 的资源使用情况：
- 当高于设定的阈值时，会自动增加 pod 的数量；
- 当低于某个阈值时，会自动减少 pod 的数量。

自然，这里的阈值以及 pod 的上限和下限的数量都是需要用户配置的。

:::center
  ![](../assets/HPA.svg)<br/>
  图 7-1 Node 资源逻辑分配图
:::

上面这句话隐藏了一个重要的信息：HPA 只能和 RC、deployment、RS 这些可以动态修改 replicas 的对象一起使用，而无法用于单个 Pod、Daemonset（因为它控制的 pod 数量不能随便修改）等对象。

目前官方的监控数据来源是 metrics server 项目，可以配置的资源 CPU、自定义的监控数据（比如 prometheus） 等。


## Vertical Pod AutoScaling（垂直 Pod 自动扩展）

和 HPA 的思路相似，只不过 VPA 调整的是单个 pod 的 request 值（包括 CPU 和 memory）。VPA 包括三个组件：

- Recommander：消费 metrics server 或者其他监控组件的数据，然后计算 pod 的资源推荐值。
- Updater：找到被 vpa 接管的 pod 中和计算出来的推荐值差距过大的，对其做 update 操作（目前是 evict，新建的 pod 在下面 admission controller 中会使用推荐的资源值作为 request）。
- Admission Controller：新建的 pod 会经过该 Admission Controller，如果 pod 是被 vpa 接管的，会使用 Recommander 计算出来的推荐值。

可以看到，这三个组件的功能是互相补充的，共同实现了动态修改 Pod 请求资源的功能。

## 基于事件驱动的 HPA 增强

HPA 虽然能基于外部指标实现弹性伸缩，但缺点是仅与 Prometheus 指标关联。

如果你想要更好的处理好资源，那么你可以了解 KEDA 这个项目。

:::tip KEDA 是什么？

KEDA（Kubernetes Event-driven Autoscaling）是由微软和红帽合作开发的一个基于事件触发的 Kubernetes 自动伸缩器。KEDA 的出现并不是替代 HPA，而通过内置几十种常见的 Scaler[^1] 以及自定义 Scaler 对 HPA 增强。例如通过消息队列的排队深度、每秒请求数、调度的 Cron 作业数以及你能想象事件指标，来驱动 HPA 工作负载从 0->1 和 1->0 的变化。

:::

KEDA 由以下组件组成：

- Scaler：连接到外部组件（例如 Prometheus、RabbitMQ) 并获取指标（例如待处理消息队列大小）
- Metrics Adapter：将 Scaler 获取的指标转化成 HPA 可以使用的格式并传递给 HPA
- Controller：负责创建和更新一个 HPA 对象，并负责扩缩到零
- keda operator：负责创建维护 HPA 对象资源，同时激活和停止 HPA 伸缩。在无事件的时候将副本数降低为 0 (如果未设置 minReplicaCount 的话)
- metrics server: 实现了 HPA 中 external metrics，根据事件源配置返回计算结果。

<div  align="center">
  <img src="../assets/keda-arch.png" width = "400"  align=center />
</div>


如下，一个 Kafka 伸缩实例。

```
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: brm-index-basic
  pollingInterval: 10
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka-server:9092
        consumerGroup: basic
        topic: basic
        lagThreshold: "100"
        offsetResetPolicy: latest
```
minReplicaCount 和 maxReplicaCount 分别定义了要伸缩的对象的最小和最大副本数量，minReplicaCount 可以为 0 即缩容到没有副本，比方说 Kafka 队列一直没有新消息就可以完全缩容，到有新消息进来的时候 keda 又会自动扩容。

## Cluster AutoScaler

随着业务的发展，应用会逐渐增多，每个应用使用的资源也会增加，总会出现集群资源不足的情况。为了动态地应对这一状况，我们还需要 CLuster Auto Scaler，能够根据整个集群的资源使用情况来增减节点。

Cluster AutoScaler 是一个自动扩展和收缩 Kubernetes 集群 Node 的扩展。当集群容量不足时，它会自动去 Cloud Provider（支持绝大部分的云服务商 GCE、GKE、Azure、AKS、AWS 等等）创建新的 Node，而在 Node 长时间（超过 10 分钟）资源利用率很低时（低于 50%）自动 Pod 会自动调度到其他 Node 上面，并删除节点以节省开支。

<div  align="center">
  <img src="../assets/Cluster-AutoScaler.png" width = "500"  align=center />
</div>

Cluster Autoscaler 虽然是 Kubernetes 官方标准，但是由于他深度依赖公有云厂商，因此具体使用方法，功能以及限制以公有云厂商具体实现为准。

[^1]: 参见 https://keda.sh/docs/2.12/scalers/
[^2]: 参见 https://keda.sh/community/#end-users

