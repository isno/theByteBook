# 7.7.2 资源分配以及 QoS

在 Kubernetes 中，Pod 是最小的调度单元。这意味着，所有与调度和资源管理相关的属性都应该内嵌于 Pod 对象本身。

## 1. 资源分配

Kubernetes 设计了以下两个概念用来描述 Pod 资源的分配：

1. **requests**：容器请求使用的资源，kubernetes 会保证 Pod 能使用到这么多的资源。requests 资源是调度的依据，只有当节点上的可用资源大于 Pod 请求的资源时，调度器才会把 Pod 调度到该节点上。
2. **limits** ：容器使用资源的上限，防止过量消耗资源导致资源短缺甚至宕机。实际会配置到 cgroups 对应任务的 /sys/fs/cgroup.. 文件中。

Pod 是由一到多个容器组成，所以资源需求是描述在容器上的。如下图所示，每一个容器都可以独立地通过 resources 属性设定相应的 requests 和 limits。其中，container-1 指定容器进程需要 500/1000 核（50%）才能被调度，并且允许最多使用 1000/1000 核（100%）。

:::center
  ![](../assets/requests-limits.png)<br/>
:::

Requests 和 limits 的配置除了表明资源情况和限制资源使用之外，还有一个隐藏的作用：它决定了 Pod 的 QoS 等级。

## 2. Qos 等级

Kubernetes 基于每个 Pod 中容器的资源请求（requests）和限制（limits）为 Pod 设置服务质量（Quality of Service，QoS）类。不同的 QoS 类决定了当节点资源不足时 Kubernetes 如何处理节点上的 Pod。

Pod 中 requests 和 limits 与 QoS 类的对应关系如图所示：

- **Guaranteed**：优先级最高，可以考虑数据库应用或者一些重要的业务应用。除非 Pod 使用超过了它们的 limits，或者节点的内存压力很大而且没有 QoS 更低的 Pod，否则不会被杀死。
- **Burstable**：这种类型的 Pod 可以多于自己请求的资源（上限由 limit 指定，如果 limit 没有配置，则可以使用宿主机中的任意可用资源），但是重要性认为比较低，可以是一般性的应用或者批处理任务。
- **Best Effort**：优先级最低，可以是一些临时性的不重要应用。该类型 Pod 可以使用节点上可用资源，但在资源不足时也会被优先杀死。

:::center
  ![](../assets/qos.webp)<br/>
:::

从上面看到，不配置 requests 和 limits 的情况下， Pod 的 QoS 等级是最低的，当节点资源波动时，受到的影响也最大。所以推荐按照资源使用需求合理配置 requests 和 limits 参数，让调度更准确，也能让服务更稳定。

## 3. 驱逐机制

当节点内不可压缩类型的资源，如可用内存（memory.available）、宿主机磁盘空间（nodefs.available）、镜像存储空间（imagefs.available）不足时，保证节点稳定的手段是驱逐（Eviction，即资源回收）那些不太重要的 Pod，使之重新调度到其他节点。

Pod 的驱逐机制是通过 Kubelet 来执行的，Kubelet 运行在节点之，因此也最容易感知节点资源耗用情况。当 Kubelet 感知到不可压缩类型的资源即将耗尽时，便会触发相应的驱逐策略。

Kubelet 第一种驱逐策略为软驱逐（soft eviction）。因为节点资源耗用情况有可能是临时性的波动，几十秒之后就会恢复。所以，当发现资源耗用达到设定阈值后，不应该立即触发驱逐操作，而是观察一段时间再做决定。Kubelet 中和软驱逐相关的配置参数是：

- --eviction-soft：软驱逐触发条件。例如，可用内存（memory.available）< 500Mi，可用磁盘空间（nodefs.available）< 10% 等等。
- --eviction-soft-grace-period：软驱逐宽限期。例如，memory.available=2m30s，即可用内存 < 500Mi，并持续 2m30s 后，才真正开始驱逐 Pod。
- --eviction-max-pod-grace-period：最大 Pod 优雅终止宽限期，该参数决定给 Pod 多少时间来优雅地关闭（graceful shutdown）。

Kubelet 第二种驱逐策略为硬驱逐（hard eviction），该策略主要照顾节点的稳定性，防止资源殆尽导致节点不可用。硬驱逐直接干脆，当 Kubelet 发现节点资源耗用情况达到硬驱逐阈值后，会立即杀死 Pod。Kubelet 中，硬驱逐相关的配置参数只有一个 --evictio-hard，它的配置和 eviction-soft 一致，笔者就不再赘述了。

此外，当 Kubelet 驱逐一部分 Pod 后，节点的资源耗用情况可能在一段时间后再次达到阈值，又重新触发新的驱逐，形成循环，这种问题称为“驱逐波动”。Kubelet 预留了下述参数，避免因资源紧张而频繁触发驱逐操作：
- --eviction-minimum-reclaim：该参数决定每次驱逐至少要回收的资源资源量，以停止驱逐操作。
- --eviction-pressure-transition-period：该参数决定 Kubelet 上报节点状态的时间间隔。如果上报周期较短，频繁更改节点状态可能导致驱逐波动。

最后，以下是与驱逐相关的 Kubelet 配置示例：

```bash
$ kubelet --eviction-soft=memory.available<500Mi,nodefs.available < 10%,nodefs.inodesFree < 5%,imagefs.available < 15% \
--eviction-soft-grace-period=memory.available=1m30s,nodefs.available=1m30s \
--eviction-max-pod-grace-period=120 \
--eviction-hard=memory.available<500Mi,nodefs.available < 5% \
--eviction-pressure-transition-period=30s \
--eviction-minimum-reclaim="memory.available=500Mi,nodefs.available=500Mi,imagefs.available=1Gi"
```




