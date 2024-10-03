# 7.7.1 资源模型与资源管理

## 1. 资源模型

显然，物理资源中最典型的代表是 CPU 和内存资源。

在 Kubernetes 中，像 CPU 这样的资源称为**可压缩的资源**。可压缩资源的特点是，当它不足时，Pod 使用资源会被限制，应用表现变得卡顿，但 Pod 不会被杀掉。而像内存这样的资源称为**不可压缩的资源**。不可压缩资源的特点是，当容器耗用情况超过了申请的最大限度，Pod 一定因资源不足出现运行问题，并最终触发驱逐操作（eviction，稍后介绍）。

Kubernetes 中的 CPU 资源的计量单位是“CPU 的个数”。例如，CPU=1 指的是 Pod 的 CPU 限额是 1 个 CPU。至于一个 CPU 如何解释，取决于宿主机上如何解释，它可能是多核处理器中的一个核心、1 个 CPU 的超线程（Hyper-Threading）或者是虚拟机中的一个虚拟化处理器（Virtual CPU，vCPU）。对于不同硬件环境构建的 Kubernetes 集群，1 个 CPU 的算力有可能是全完不一样的。Kubernetes 只保证 Pod 能够使用“1个 CPU” 的算力。

实际上，Kubernetes 中 CPU 更通用的计量单位是毫核（Millcores）。1 个 CPU 等于 1000 millicores。如此，我们便可以更精确的度量和分配 CPU 资源。例如，分配给一个容器 500m CPU，即 0.5 个 CPU 。

对于内存资源来说，它最基本的计量单位字节。如果使用中不明确单位，默认以字节计数。为了使用方便，Kubernetes 支持 Ki、Mi、Gi、Ti、Pi、Ei 或者 K、M、G、T、P、E 。例如，下面是一些近似相同的值：

```plain
128974848, 129e6, 129M, 123Mi
```
注意 Mebibyte 和 Megabyte 的区分，123 Mi = `123*1024*1024 B` 、123 M = `1*1000*1000 B`，显然使用带小 i 的更准确。

## 2. 资源分配

在 Kubernetes 中，Pod 是最小的调度单元。这意味着，调度和资源管理相关的属性应该属于 Pod 对象内的字段。与调度有着直接关系的就是 CPU 和内存的配置，如下所示：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: qos-demo-5
  namespace: qos-example
spec:
  containers:
    - name: qos-demo-ctr-5
      image: nginx
      resources:
        limits:
          memory: "200Mi"
          cpu: "700m"
        requests:
          memory: "200Mi"
          cpu: "700m"
```

Kubernetes 使用两个属性描述 Pod 资源的分配和限制：

1. **requests**：容器请求使用的资源，Kubernetes 会保证 Pod 能使用到这么多的资源。requests 资源是调度的依据，只有当节点上的可用资源大于 Pod 请求的资源时，调度器才会把 Pod 调度到该节点上。
2. **limits** ：容器使用资源的上限，防止过量消耗资源导致资源短缺甚至宕机。实际会配置到 cgroups 对应任务的 /sys/fs/cgroup.. 文件中。

Pod 是由一到多个容器组成，所以资源需求是描述在容器上的。如下图所示，每一个容器都可以独立地通过 resources 属性设定相应的 requests 和 limits。其中，container-1 指定容器进程需要 500/1000 核（50%）才能被调度，并且允许最多使用 1000/1000 核（100%）。

:::center
  ![](../assets/requests-limits.png)<br/>
:::

requests 和 limits 的配置除了表明资源情况和限制资源使用之外，还有一个隐藏的作用：它决定了 Pod 的 QoS（Quality of Service，服务质量）等级。

## 3. 服务质量等级

Kubernetes 基于每个 Pod 中容器的资源请求（requests）和限制（limits）为每个 Pod 设置不同的服务质量（Quality of Service，QoS）等级。不同的 QoS 等级决定了当节点内资源不足时，Kubernetes 如何处理节点上的 Pod，也就是稍后要讲到的驱逐（Eviction）。

Pod 的 QoS 级别对应关系如图所示，它们的名称与含义如下：

- **Guaranteed**：Pod 中的每个容器都必须设置 CPU 和内存的请求（requests）和限制（limits），并且两者相等。这种类型的 Pod 通常用于需要稳定资源的应用程序，如数据库。在资源紧张时，Guaranteed 类型的 Pod 最不可能被驱逐。
- **Burstable**：Pod 中至少有一个容器设置了请求或限制，但不是全部容器的请求和限制都相等。这种类型的 Pod 可以利用节点上的空闲资源，但如果资源紧张，可能会被驱逐。Burstable 类型的 Pod 在资源使用上有一定的灵活性，但优先级低于 Guaranteed 类型的 Pod。
- **Best Effort**：Pod 中的容器没有设置 CPU 和内存的请求和限制。这种类型的 Pod 会尽可能地使用可用资源，但在资源紧张时会首先被驱逐。BestEffort 类型的 Pod 通常用于临时或非关键性任务。

:::center
  ![](../assets/qos.webp)<br/>
:::

从上面看到，不配置 requests 和 limits 的情况下， Pod 的 QoS 等级是最低的。当节点资源紧张时，受到的影响也最大。所以，推荐按照资源使用需求合理配置 requests 和 limits 参数，让调度更准确，也能让服务更稳定。

## 4. 节点资源管理

由于每台节点上都运行着容器运行时（如 Docker、containerd）以及管理容器的组件 kubelet。Kubernetes 进行资源管理时，需要为此类基础服务预留一部分资源。预留之后的剩余资源才是 Pod 真正可以使用的。

为节点上的基础服务预留多少资源，可以使用如下 kubelet 预留的参数来控制：

- --kube-reserved=[cpu=100m][,][memory=100Mi][,][ephemeral-storage=1Gi]：预留给 kubernetes 组件 CPU、内存和存储资源。
- --system-reserved=[cpu=100mi][,][memory=100Mi][,][ephemeral-storage=1Gi]：预留给操作系统的 CPU、内存和存储资源。

需要注意的是，考虑到 Kubernetes 驱逐机制的存在，kubelet 会确保节点上的资源使用率不会达到 100%，因此 Pod 实际可用的资源会再少一些。最终，一个节点资源分配如图 7-33 所示。节点可分配资源（Node Allocatable Resource）= 节点所有资源（Node Capacity） -（ Kubernetes 组件预留资源（Kube Reserved）-系统预留资源（System Reserved）- 为驱逐预留的资源（Eviction-Threshold）。

:::center
  ![](../assets/k8s-resource.svg)<br/>
  图 7-33 Node 资源逻辑分配图
:::


## 5. 驱逐机制

当不可压缩类型的资源，如可用内存（memory.available）、宿主机磁盘空间（nodefs.available）、镜像存储空间（imagefs.available）不足时，保证节点稳定的手段是驱逐（Eviction，即资源回收）那些不太重要的 Pod，使之重新调度到其他节点。

Pod 驱逐是通过 Kubelet 来执行的。因为 Kubelet 运行在节点之，最容易感知节点资源耗用情况。当 Kubelet 感知到不可压缩类型的资源即将耗尽时，便会触发相应的驱逐策略。Kubelet 中有两种驱逐策略。

Kubelet 第一种驱逐策略为软驱逐（soft eviction）。因为节点资源耗用情况有可能是临时性的波动，几十秒之后就会恢复。所以，当发现资源耗用达到设定阈值后，不应该立即触发驱逐操作，而是观察一段时间再做决定。Kubelet 中和软驱逐相关的配置参数是：

- --eviction-soft：软驱逐触发条件。例如，可用内存（memory.available）< 500Mi，可用磁盘空间（nodefs.available）< 10% 等等。
- --eviction-soft-grace-period：软驱逐宽限期。例如，memory.available=2m30s，即可用内存 < 500Mi，并持续 2m30s 后，才真正开始驱逐 Pod。
- --eviction-max-pod-grace-period：最大 Pod 优雅终止宽限期，该参数决定给 Pod 多少时间来优雅地关闭（graceful shutdown）。

Kubelet 第二种驱逐策略为硬驱逐（hard eviction），该策略主要照顾节点的稳定性，防止资源殆尽导致节点不可用。硬驱逐相当干脆，当 Kubelet 发现节点资源耗用情况达到硬驱逐阈值后，会立即杀死 Pod。Kubelet 中，与硬驱逐相关的配置参数只有一个 --evictio-hard，它的配置和 eviction-soft 一致，笔者就不再赘述了。

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









