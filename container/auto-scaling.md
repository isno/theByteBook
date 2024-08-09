# 7.8 资源弹性伸缩

应用的实际流量会不断变化，因此使用率也是不断变化的，应该有一种自动调整应用的资源的策略，譬如一个在线电子商城：
- 促销的时候访问量会增加，应该自动增加服务运算能力来应对；
- 当促销结束后，又需要自动降低服务的运算能力防止浪费。

运算能力的增减有两种方式：增减 Pod 的数量以及改变单个 Pod 的资源，这两种方式分别对应了 Kubernetes 的 HPA 和 VPA 组件。

## 7.8.1 Pod 水平自动伸缩

横向 Pod 自动扩展的思路是这样的：kubernetes 会运行一个 controller，周期性地监听 Pod 的资源使用情况：
- 当高于设定的阈值时，会自动增加 pod 的数量；
- 当低于某个阈值时，会自动减少 pod 的数量。

自然，这里的阈值以及 Pod 的上限和下限的数量都是需要用户配置的。

:::center
  ![](../assets/HPA.svg)<br/>
  图 7-34 Node 资源逻辑分配图
:::

上面这句话隐藏了一个重要的信息：HPA 只能和 RC、deployment、RS 这些可以动态修改 replicas 的对象一起使用，而无法用于单个 Pod、Daemonset（因为它控制的 Pod 数量不能随便修改）等对象。

目前官方的监控数据来源是 metrics server 项目，可以配置的资源 CPU、自定义的监控数据（比如 prometheus） 等。

## 7.8.2 Pod 垂直自动伸缩

和 HPA 的思路相似，只不过 VPA 调整的是单个 Pod 的 request 值（包括 CPU 和 memory）。VPA 包括三个组件：

- Recommander：消费 metrics server 或者其他监控组件的数据，然后计算 Pod 的资源推荐值。
- Updater：找到被 vpa 接管的 Pod 中和计算出来的推荐值差距过大的，对其做 update 操作（目前是 evict，新建的 Pod 在下面 admission controller 中会使用推荐的资源值作为 request）。
- Admission Controller：新建的 Pod 会经过该 Admission Controller，如果 Pod 是被 vpa 接管的，会使用 Recommander 计算出来的推荐值。

可以看到，这三个组件的功能是互相补充的，共同实现了动态修改 Pod 请求资源的功能。

## 7.8.3 基于事件驱动的弹性伸缩

HPA 虽然能基于外部指标实现弹性伸缩，但缺点是仅与 Prometheus 指标关联。

为了更好地降低资源成本，微软和红帽联合开发一种基于事件触发的 Kubernetes 自动伸缩器 KEDA（Kubernetes Event-driven Autoscaling）。KEDA 的出现并非取代 HPA，它们实际上是一种组合配合关系。KEDA 通过内置几十种常见的 Scaler 或者用户自定义的 Scaler，来增强 HPA 的功能。例如，KEDA 可以根据消息队列的排队深度、每秒请求数、调度的 Cron 作业数等事件指标，驱动 HPA 动态调整工作负载，从 0 扩展到 1，或从 1 缩减到 0。

KEDA 的工作原理如图 7-35 所示，核心的组件如下：

- Scaler：连接到外部组件（如 Prometheus、RabbitMQ）以获取相关指标（如待处理消息队列的大小）。这些指标用于判断是否需要进行扩缩容操作。
- Metrics Adapter：将 Scaler 获取到的指标转化为 HPA（Horizontal Pod Autoscaler）能够使用的格式，并将这些指标传递给 HPA，使其能够基于这些数据进行自动扩缩容。
- Controller：负责创建和维护 HPA 对象资源，同时管理 HPA 的激活和停止。在没有事件触发时，Controller 会将副本数降低为 0（如果 minReplicaCount 未设置的话），以节省资源。

:::center
  ![](../assets/keda-arch.png)<br/>
  图 7-35 KADA 架构图
:::

以下是一个 Kafka 的伸缩配置示例。minReplicaCount 和 maxReplicaCount 分别定义了伸缩对象的最小和最大副本数量。其中，minReplicaCount 可以设置为 0，这意味着在没有新消息的情况下，Kafka 的副本数量可以缩减至 0，实现完全缩容。当 Kafka 队列中有新消息到达时，KEDA 会自动触发扩容操作，确保系统能够及时处理消息负载。

```yaml
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
  minReplicaCount: 0
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

## 7.8.4 集群节点自动伸缩

随着业务的发展，应用数量和资源需求都会逐渐增加，最终可能导致集群资源不足。那么动态伸缩的范畴应该扩展到整个集群范围，也就是说能根据资源利用率情况自动增/减节点。

在 Kubernetes 中，Cluster AutoScaler 是专门用于自动扩展和缩减集群节点的组件。它的主要功能如下：
- 当集群容量不足时，Cluster AutoScaler 会自动向云服务提供商（如 GCE、GKE、Azure、AKS、AWS 等）请求创建新的节点，从而扩展集群容量，确保应用能够获得所需的资源。
- 当某个节点的资源利用率长期处于较低水平（如低于 50%），Cluster AutoScaler 会自动将该节点上的 Pod 重新调度到其他节点，然后删除低效节点，将其资源归还给云服务商，从而节省运营成本。

:::center
  ![](../assets/Cluster-AutoScaler.png)<br/>
  图 7-36 Cluster AutoScaler 伸缩原理
:::

Cluster Autoscaler 虽然是 Kubernetes 官方标准，但是由于他深度依赖公有云厂商，因此具体使用方法，功能以及限制以公有云厂商具体实现为准。

[^1]: 参见 https://keda.sh/docs/2.12/scalers/
[^2]: 参见 https://keda.sh/community/#end-users

