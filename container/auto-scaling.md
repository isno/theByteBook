# 7.8 资源弹性伸缩

为了平衡服务负载的巨大波动及资源预估与实际使用之间的差距，Kubernetes 提供了三种资源自动扩缩（autoscaling）解决方案：HPA、VPA 以及节点自动伸缩（Cluster Autoscaler）组件。
## 7.8.1 Pod 水平自动伸缩

HPA，全称是 Horizontal Pod Autoscaler（Pod 水平自动扩缩），是 Kubernetes 中对工作负载（如 Deployment）Pod 副本数进行自动水平扩缩的机制，也是 Kubernetes 中最广泛使用的自动扩缩功能。

HPA 的实现思路很简单：即通过监控业务的繁忙程度来做出相应的调整。当负载较高时，增加工作负载的 Pod 副本数量；当负载减少时，Pod 副本数也会相应缩减。所以，实现扩缩容的关键问题之一是：“如何准确识别业务的忙闲程度？”

Kubernetes 提供了一种标准的 Metrics API，能够提供关于节点和 Pod 资源使用情况的信息。如下所示，在 minikube 节点上一个 Metrics API 响应示例。

```bash
$ kubectl get --raw "/apis/metrics.k8s.io/v1beta1/nodes/minikube" | jq '.'
{
  "kind": "NodeMetrics",
  "apiVersion": "metrics.k8s.io/v1beta1",
  "metadata": {
    "name": "minikube",
    "selfLink": "/apis/metrics.k8s.io/v1beta1/nodes/minikube",
    "creationTimestamp": "2022-01-27T18:48:43Z"
  },
  "timestamp": "2022-01-27T18:48:33Z",
  "window": "30s",
  "usage": {
    "cpu": "487558164n",
    "memory": "732212Ki"
  }
}
```
最初，Metrics API 仅支持 CPU 和内存的使用指标。随着需求的增加，Metrics API 开始支持用户自定义指标（Custom Metrics）。对于自定义指标，用户需要自行开发 Custom Metrics Server，调用其他服务（如 Prometheus）来获取相关数据。

有了 Metrics API，Kubernetes 便能够识别业务的繁忙程度。接下来，如图 7-38 所示，通过命令 kubectl autoscale 创建 HPA，并设置监控的指标类型（如 cpu-percent）、期望的目标值（70%）以及 Pod 副本数量的范围（最少 1 个，最多 10 个）。

```bash
kubectl autoscale deployment foo --cpu-percent=70 --min=1 --max=10
```
随后，HPA 定期实时获取 Metrics 数据，并将其与设定的目标值进行比较，以决定是否进行扩缩。如果需要扩缩，HPA 调用 Deployment 的 Scale 接口调整当前的副本数量，最终实现将 Deployment 下每个 Pod 的负荷维持在用户期望的水平。

:::center
  ![](../assets/HPA.svg)<br/>
  图 7-38 HPA 扩缩容的原理
:::

## 7.8.2 Pod 垂直自动伸缩

VPA，全称是 Vertical Pod Autoscaler（Pod 垂直自动伸缩）。VPA 的实现思路与 HPA 基本一致，也是通过监控 Metrics 接口并根据指标评估后做出相应的调整。不同的是，VPA 调整的是工作负载的资源配额（如 Pod 的 CPU 和内存的 request 和 limit）。

值得注意的是，VPA 是 Kubernetes 中的一个可选附加组件，需单独安装和配置后，才能为特定工作负载（如 Deployment）创建 VPA 资源并定义资源调整策略。以下是一个 VPA 配置示例，供读者参考：

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: example-app-vpa
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: example-app
  updatePolicy:
    updateMode: Auto  # 决定 VPA 如何应用推荐的资源调整，也可以设置为 "Off" 或 "Initial" 来控制更新策略
```

将上述 YAML 文件提交到 Kubernetes 集群后，可以通过 kubectl describe vpa 命令查看 VPA 推荐的资源策略。

```bash
$ kubectl describe vpa example-app-vpa
...
Recommendation:
    Container Recommendations:
      Container Name:  nginx
      Lower Bound:
        Cpu:     25m
        Memory:  262144k
      Target:
        Cpu:     25m
        Memory:  262144k
      Uncapped Target:
        Cpu:     25m
        Memory:  262144k
      Upper Bound:
        Cpu:     11601m
        Memory:  12128573170
...
```

可见，VPA 适用于负载动态变化较大且资源使用需求不确定的应用场景，尤其是在无法精确预估应用资源需求的情况下。

## 7.8.3 基于事件驱动的伸缩

虽然 HPA 基于 Metrics 接口实现了弹性伸缩，但 Metrics 接口指标范围有限且粒度较粗。为了实现能基于外部事件更细粒度的扩缩容，微软与红帽联合开发了基于事件驱动的 Kubernetes 自动扩缩器 —— KEDA（Kubernetes Event-driven Autoscaling）。

KEDA 的出现并非为了取代 HPA，而是与其形成互补关系。

KEDA 的工作原理如图 7-39 所示：用户通过配置 ScaledObject（缩放对象）来定义 Scaler（KEDA 的内部组件）的工作方式，Scaler 持续从外部系统获取状态数据，并将这些数据与配置的扩缩条件进行比较。当条件满足时，Scaler 触发扩缩操作，调用 Kubernetes 的 HPA 组件调整工作负载 Pod 副本数。

:::center
  ![](../assets/keda-arch.png)<br/>
  图 7-39 KADA 架构图
:::

KEDA 内置了几十种常见的 Scaler，用于处理特定的事件源或指标源。笔者列举一些常见的 Scaler 供参考：
- 消息队列 Scaler：如 Kafka、RabbitMQ、Azure Queue、AWS SQS 等消息队列的消息数量。
- 数据库 Scaler：如 SQL 数据库的连接数、查询延迟等。
- HTTP 请求 Scaler：基于 Web API 的请求数量或响应时间。
- Prometheus Scaler：通过 Prometheus 获取自定义指标来触发扩缩操作，如队列长度、CPU 使用率等业务特定指标。
- 时间 Scaler：根据特定时间段触发扩缩逻辑，例如每日的高峰期或夜间低峰期。


以下是一个 Kafka Scaler 的配置示例，它监控某个 Kafka 主题中的消息数量：
- 当消息数量超过设定的阈值时，将触发 Kubernetes 集群中的工作负载自动扩展，以处理更多消息。
- 当消息处理完毕，消息队列变为空时，Scaler 会触发缩减操作，减少 Pod 的副本数（可以缩减至 0，minReplicaCount）。

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
- 自动扩展（Scale Up）：当集群中的节点资源不足以满足当前的 Pod 请求时，Cluster AutoScaler 会自动向云服务提供商（如 GCE、GKE、Azure、AKS、AWS 等）请求创建新的节点，扩展集群容量，从而确保应用能够获得所需的资源。
- 自动缩减（Scale Down）：当某个节点的资源利用率长期处于较低水平（如低于 50%），Cluster AutoScaler 会自动将该节点上的 Pod 重新调度到其他节点，在确定节点可以安全地移除时，将这些节点从集群中移除，从而减少成本和资源浪费。

:::center
  ![](../assets/Cluster-AutoScaler.png)<br/>
  图 7-40 Cluster AutoScaler 自动缩减（Scale Down）的原理
:::

Cluster Autoscaler 虽然是 Kubernetes 官方标准，但是由于他深度依赖公有云厂商，因此具体使用方法、功能以及限制以公有云厂商具体实现为准。笔者就不再过多介绍了。

[^1]: 参见 https://keda.sh/docs/2.12/scalers/
[^2]: 参见 https://keda.sh/community/#end-users

