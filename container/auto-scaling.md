# 7.8 资源弹性伸缩

应用的实际流量会不断变化，因此使用率也是不断变化的，应该有一种自动调整应用的资源的策略，譬如一个在线电子商城：
- 促销的时候访问量会增加，应该自动增加服务运算能力来应对；
- 当促销结束后，又需要自动降低服务的运算能力防止浪费。

运算能力的增减有两种方式：增减 Pod 的数量以及改变单个 Pod 可用资源，这两种方式分别对应了 Kubernetes 的 Pod 水平自动扩缩（Horizontal Pod Autoscaler，HPA）和 Pod 垂直自动扩缩（Vertical Pod Autoscaler，VPA）组件。

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

HPA 虽然能基于外部指标实现弹性伸缩，但缺点指标有限且粒度太粗。为了根据外部事件实现更细粒度的自动扩展，微软和红帽联合开发一种基于事件触发的 Kubernetes 自动伸缩器 KEDA（Kubernetes Event-driven Autoscaling）。

KEDA 的出现并非取代 HPA，它们实际上是一种组合配合关系。KEDA 的工作原理如图 7-35 所示，用户通过配置 ScaledObject（缩放对象）来定义 Scaler 的工作方式，Scaler（KEDA 内部的组件）持续从外部系统获取实时数据，并将这些数据与配置的扩展条件进行比较。当条件满足时，Scaler 将触发扩展操作，调用 Kubernetes 的 Horizontal Pod Autoscaler（HPA）调整对应工作负载的 Pod 副本数。

:::center
  ![](../assets/keda-arch.png)<br/>
  图 7-35 KADA 架构图
:::

KEDA 通过内置几十种常见的 Scaler 用来处理特定的事件源或指标源，笔者列举常见的 Scaler 供你参考：

- 消息队列 Scaler：如 Kafka、RabbitMQ、Azure Queue、AWS SQS 等消息队列的消息数量。
- 数据库 Scaler：如 SQL 数据库的连接数、数据库查询延迟等。
- HTTP 请求 Scaler：基于 Web API 的请求数量或响应时间。
- Prometheus Scaler：通过 Prometheus 获取的自定义指标来触发扩展，如队列长度、CPU 使用率等业务特定指标。
- 时间 Scaler：根据特定的时间段触发扩展逻辑，例如每日的高峰期或夜间低峰期。


以下是一个 Kafka Scaler 配置示例，它监控某个 Kafka 主题中的消息数量。当消息数量超过设定的阈值时，它会触发 Kubernetes 集群中的工作负载自动扩展以处理更多的消息；当消息处理完毕，消息队列变空时，Scaler 会触发缩减操作，减少 Pod 的副本数（可以缩减至 0，minReplicaCount）。

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

## 7.8.4 节点自动伸缩

随着业务的增长（也有可能萎缩），应用数量和资源需求相应的变化，可能导致集群资源不足或者资源过度冗余。为了有效控制成本，动态伸缩的范畴应该扩展到整个集群范围，也就是说能根据资源利用率情况自动增/减节点。

在 Kubernetes 中，Cluster AutoScaler 是专门用于自动扩展和缩减集群节点的组件。它的主要功能如下：
- 自动扩展（Scale Up）：当集群中的节点资源不足以满足当前的 Pod 请求时，Cluster AutoScaler 会自动向云服务提供商（如 GCE、GKE、Azure、AKS、AWS 等）请求创建新的节点，从而扩展集群容量，确保应用能够获得所需的资源。
- 自动缩减（Scale Down）：当某个节点的资源利用率长期处于较低水平（如低于 50%），Cluster AutoScaler 会自动将该节点上的 Pod 重新调度到其他节点，并在确定某些节点可以安全地移除时，将这些节点从集群中移除，以减少成本和资源浪费。

:::center
  ![](../assets/Cluster-AutoScaler.png)<br/>
  图 7-36 Cluster AutoScaler 伸缩原理
:::

Cluster Autoscaler 虽然是 Kubernetes 官方标准，但是由于他深度依赖公有云厂商，因此具体使用方法、功能以及限制以公有云厂商具体实现为准。笔者就不再过多介绍了。

[^1]: 参见 https://keda.sh/docs/2.12/scalers/
[^2]: 参见 https://keda.sh/community/#end-users

