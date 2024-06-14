# 7.7.2 资源描述以及 QoS

在 Kubernetes 里，Pod 是最小的原子调度单位。这意味着，所有跟调度和资源管理相关的属性都应该是属于 Pod 对象的字段。

## 1. 描述资源的分配

Kubernetes 抽象了两个概念用来描述 Pod 资源的分配：

1. **requests** 是容器请求要使用的资源，kubernetes 会保证 Pod 能使用到这么多的资源。requests 资源是调度的依据，只有当节点上的可用资源大于 Pod 请求的各种资源时，调度器才会把 Pod 调度到该节点上。
2. **limits** 容器最大可以消耗的资源上限，防止过量消耗资源导致资源短缺甚至宕机。实际会配置到 cgroups 对应任务的 /sys/fs/cgroup.. 文件中

Pod 是由一到多个容器组成，所以资源的需求作用在容器上的。如下图所示，每一个容器都可以独立地通过 resources 属性设定相应的 requests 和 limits。其中，container-1 指定容器进程需要 500/1000 核（50%）才能被调度，并且允许最多使用 1000/1000 核（100%）。

:::center
  ![](../assets/requests-limits.png)<br/>
:::

Requests 和 limits 的配置除了表明资源情况和限制资源使用之外，还有一个隐藏的作用：它决定了 Pod 的 QoS 等级。

## 2. 服务质量 Qos 等级

当操作系统资源不足时，部分容器会被驱逐，QoS 级别决定了 Kubernetes 处理这些 Pod 的方式。

Kubernetes 将容器划分为 3 个 Qos 等级，优先级依次递减：

- **Guaranteed**：优先级最高，可以考虑数据库应用或者一些重要的业务应用。除非 Pod 使用超过了它们的 limits，或者节点的内存压力很大而且没有 QoS 更低的 Pod，否则不会被杀死。
- **Burstable**：这种类型的 Pod 可以多于自己请求的资源（上限由 limit 指定，如果 limit 没有配置，则可以使用宿主机中的任意可用资源），但是重要性认为比较低，可以是一般性的应用或者批处理任务。
- **Best Effort**：优先级最低，可以是一些临时性的不重要应用。该类型 Pod 可以使用节点上可用资源，但在资源不足时也会被优先杀死。

Pod 的 requests 和 limits 如何对应到这 3 个 QoS 等级上，可以用下图概括。

:::center
  ![](../assets/qos.webp)<br/>
:::

从上面看到，不配置 requests 和 limits 的 QoS 等级是最低的，所以推荐按照资源使用需求合理配置 requests 和 limits 参数，这样可以让调度更准确，也能让系统更加稳定。

## 3. 驱逐

理想的情况下资源完全够用，而且应用也都使用规范内的资源。

但现实不会如你所愿，晚高峰、大促都会导致集群资源产生大的波动。**当资源不足时（譬如可用内存 memory.available、宿主机磁盘空间 nodefs.available、镜像存储空间 imagefs.available 不足），保证整个集群可用的手段是驱逐那些不太重要的 Pod**。

### 3.1 驱逐的方式

Kubernetes 有 2 种驱逐策略，soft eviction（软驱逐）和 hard eviction（硬驱逐）：
- 软驱逐照顾到了 Pod 的优雅退出，减少驱逐对 Pod 的影响；
- 硬驱逐则照顾到节点的稳定性，防止资源的快速消耗导致节点不可用。

软驱逐还需要**配置一个时间指定软驱逐条件持续多久才触发（grace period）**，因为系统有可能是突发性的内存增高，几十秒之后就会恢复。因此，软驱逐发现资源使用率达到设定阈值后，并不会立即触发驱逐程序，而是继续观察一段时间，如果资源使用率高于阈值的情况持续一定时间，才开始驱逐。

和软驱逐相关的启动参数是：

- --eviction-soft：软驱逐触发条件，比如 memory.available<1Gi
- --eviction-sfot-grace-period：触发条件持续多久才开始驱逐，比如 memory.available=2m30s
- --eviction-max-pod-grace-period：当满足软驱逐阈值并终止 pod 时允许的最大宽限期值，该时间留给 Pod 做一些清理工作。

硬驱逐更加直接干脆，**kubelet 发现节点资源达到硬驱逐阈值后，立即开始驱逐程序，并且不会遵循 grace period**，会立即强制杀死 Pod。

硬驱逐对应的配置参数只有一个 --evictio-hard。

### 3.2 防止驱逐波动

当 kubelet 驱逐一部分 Pod 后，那么很可能过一段时间资源使用率又会达到阈值，从而再次出发驱逐，如此循环往复...。

为了处理这种问题，可以通过配置：
- --eviction-minimum-reclaim，该参数决定每次驱逐至少清理出来多少资源才会停止。
- --eviction-pressure-transition-period，该参数决定 kubelet 多久才上报节点的状态，如果上报状态周期比较短，频繁更改节点状态也会导致驱逐波动。

最后，kubelet 的驱逐配置示例如下。

```bash
$ kubelet --eviction-soft=memory.available<80%,nodefs.available<2Gi \
--eviction-soft-grace-period=memory.available=1m30s,nodefs.available=1m30s \
--eviction-max-pod-grace-period=120 \
--eviction-hard=memory.available<500Mi,nodefs.available<1Gi \
--eviction-pressure-transition-period=30s \
--eviction-minimum-reclaim="memory.available=0Mi,nodefs.available=500Mi,imagefs.available=2Gi"
```




