# 服务质量 Qos

在一个超用 （Over Committed，容器limits总和大于系统容量上限）系统中，由于容器负载波动会导致操作系统资源不足，最终可能导致部分容器被杀掉。

K8s 将容器划分为3个Qos 等级，这种优先级依次递减。

| QoS 级别| QoS介绍 |
|:--|:--|
|Guaranteed| pod 中所有容器都必须统一设置了limits，并且设置参数都一致，如果有一个容器要设置 requests，那么所有容器都要设置，并设置参数同limits一致，那么这个 POD 的QoS 就是 Guaranteed 级别 |
|Burstable| pod 中只要有一个容器，这个容器 requests 和 limits 的设置同其他容器设置的不一致，那么这个 pod 的 QoS 就是 Burstable 级别 。 |
|BestEffort | pod 中的所有容器都没有指定 CPU 和内存的 requests 和 limits，那么这个 Pod 的 QoS 就是 BestEffort 级别 |

QoS 级别决定了 kubernetes 处理这些 pod 的方式，我们以内存资源为例，当 Node 节点上内存资源不够的时候：

- QoS级别是 BestEffort 的 POD 会最先被 kill 掉
- 如果 QoS 级别是 BestEffort 的 POD 已经都被kill 掉了，那么会查找QoS级别是 Burstable 的POD，并且这些 POD 使用的内存已经超出了requests设置的内存值，这些被找到的 POD 会被 kill 掉
- 如果QoS级别是BestEffort和Burstable的POD都已经被kill掉了，那么会查找QoS级别是Guaranteed的POD，并且这些POD使用的内存已经超出了limits设置的内存值，这些被找到的POD会被kill掉