# 7.7.1 资源模型与资源管理

## 1. 资源模型

显然，物理资源中最典型的代表是 CPU 和内存资源。

在 Kubernetes 中，像 CPU 这样的资源被称为**可压缩资源**。可压缩资源的特点是，当资源不足时，Pod 的资源使用会受到限制，导致应用性能变得卡顿，但 Pod 不会因此被杀掉。而像内存这样的资源被称为**不可压缩资源**。不可压缩资源的特点是，当容器的资源使用超过了申请的最大限度，Pod 会因为资源不足而出现运行问题，最终触发驱逐操作（eviction，稍后会介绍）。

Kubernetes 中的 CPU 资源的计量单位是“个数”。例如，CPU=1 表示 Pod 的 CPU 限额为 1 个 CPU。至于“1 个 CPU”如何解释，取决于宿主机的配置，它可能是多核处理器中的一个核心、一个超线程（Hyper-Threading），或者是虚拟机中的一个虚拟处理器（Virtual CPU，vCPU）。对于不同硬件环境构建的 Kubernetes 集群，1 个 CPU 的实际算力可能有所不同，但 Kubernetes 只保证 Pod 能够使用到“1 个 CPU”这一逻辑单位的算力。

实际上，Kubernetes 中更常见的 CPU 计量单位是毫核（Millcores，缩写 m）。1 个 CPU 等于 1000m。如此一来，我们可以更加精确地度量和分配 CPU 资源。例如，分配给某个容器 500m CPU，即相当于 0.5 个 CPU。

对于内存资源来说，最基本的计量单位是字节。如果没有明确指定单位，默认以字节为计量单位。为了方便使用，Kubernetes 支持以 Ki、Mi、Gi、Ti、Pi、Ei 或 K、M、G、T、P、E 为单位来表示内存大小。例如，下面是一些近似相同的值：

```plain
128974848, 129e6, 129M, 123Mi
```
注意 Mi（Mebibyte，2 的 20 次方，即 1024）和 M（Megabyte，表示 10 的 6 次方，即 1000）的区分，123 Mi = `123*1024*1024 B` 、123 M = `1*1000*1000 B`。随着数值的增加，两者计算的差异会越来越大，因此使用带小 i 的更准确。

## 2. 资源分配

在 Kubernetes 中，Pod 是最小的调度单元。

这意味着，调度和资源管理相关的属性应包含在 Pod 对象的字段中。与调度直接相关的主要是 CPU 和内存的配置，如下所示：
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

Kubernetes 使用两个属性来描述 Pod 的资源分配和限制：

- requests：表示容器请求的资源量，Kubernetes 会确保 Pod 能获得这些资源。requests 是调度的依据，调度器只有在节点上有足够可用资源满足 Pod 的请求时，才会将 Pod 调度到该节点。
- limits：表示容器可使用资源的上限，以防止容器过度消耗资源，导致资源短缺甚至节点宕机。limits 实际上会配置到 cgroups 中对应任务的 /sys/fs/cgroup... 文件中。

Pod 是由一个或多个容器组成的，因此资源需求是在容器级别进行描述的。如图 7-32 所示，每个容器都可以通过 resources 属性单独设定相应的 requests 和 limits。例如，container-1 指定其容器进程需要 500m/1000m（即 50% 的 CPU）才能被调度，并且允许最多使用 1000m/1000m（即 100% 的 CPU）。

:::center
  ![](../assets/requests-limits.png)<br/>
  图 7-32 容器的 requests 与 limits 配置
:::

requests 和 limits 的配置，除了用于表明资源需求和限制资源使用之外，还有一个隐含的作用：它决定了 Pod 的 QoS（Quality of Service，服务质量）等级。

## 3. 服务质量等级

Kubernetes 根据每个 Pod 中容器资源配置情况，为 Pod 设置不同的服务质量（QoS，Quality of Service）等级。不同的 QoS 等级决定了当节点资源紧张时，Kubernetes 该如何处理节点上的 Pod，也就是接下来要讨论的驱逐（Eviction）机制。

图 7-33 展示了 Pod 的 QoS 级别与资源配置的对应关系，它们的名称与含义如下：

- **Guaranteed**：Pod 中的每个容器都必须设置 CPU 和内存的 requests 和 limits，并且这两者必须相等。此类 Pod 通常用于需要稳定资源的应用程序（如数据库）。当节点资源紧张时，Guaranteed 类型的 Pod 最不容易被驱逐。。
- **Burstable**：Pod 中至少有一个容器设置了 requests 或 limits，但不是全部容器的请求和限制都相等。Burstable 类型的 Pod 在资源使用上有一定的灵活性，但优先级低于 Guaranteed 类型的 Pod。当节点资源紧张时，可能会被驱逐。
- **Best Effort**：Pod 中的容器没有设置 CPU 和内存 requests 和 limits。BestEffort 类型的 Pod 通常用于临时或非关键性任务。会尽可能地使用可用资源，但资源紧张时会首先被驱逐。

:::center
  ![](../assets/qos.webp)<br/>
  图 7-33 Pod 的 QoS 级别与资源配置对应关系
:::

从上面的描述可以看出，未配置 requests 和 limits 情况下，Pod 的 QoS 等级最低，当节点资源紧张时，受影响的可能性最大。因此，根据实际资源使用需求合理配置 requests 和 limits 参数，能让调度更准确，也能让服务更稳定。

## 4. 节点资源管理

由于每个节点上都运行着容器运行时（如 Docker、containerd）以及管理容器的组件 kubelet，Kubernetes 在进行资源管理时，需要为这些基础服务预留一部分资源。预留后的剩余资源才是 Pod 实际可使用的资源。

为节点上的基础服务预留多少资源，可以通过以下 kubelet 预留参数来进行控制：

- --kube-reserved=[cpu=100m][,][memory=100Mi][,][ephemeral-storage=1Gi]：预留给 kubernetes 组件 CPU、内存和存储资源。
- --system-reserved=[cpu=100mi][,][memory=100Mi][,][ephemeral-storage=1Gi]：预留给操作系统的 CPU、内存和存储资源。

需要注意的是，考虑到 Kubernetes 驱逐机制的存在，kubelet 会确保节点上的资源使用率不会达到 100%。因此，Pod 实际可用的资源会更少一些。最终，一个节点的资源分配如图 7-34 所示。

Node Allocatable Resource（节点可分配资源）= Node Capacity（节点所有资源） - Kube Reserved（Kubernetes 组件预留资源）- System Reserved（系统预留资源）- Eviction Threshold（为驱逐预留的资源）。

:::center
  ![](../assets/k8s-resource.svg)<br/>
  图 7-34 Node 资源分配
:::

## 5. 驱逐机制

当不可压缩类型的资源（如可用内存 memory.available、宿主机磁盘空间 nodefs.available、镜像存储空间 imagefs.available）不足时，保证节点稳定的手段是驱逐（Eviction，即资源回收）那些不太重要的 Pod，使其能够重新调度到其他节点。

Pod 的驱逐是通过 Kubelet 来执行的。由于 Kubelet 运行在节点上，它能够最容易地感知节点的资源耗用情况。当 Kubelet 发现不可压缩类型的资源即将耗尽时，会触发相应的驱逐策略。Kubelet 中有两种驱逐策略。

Kubelet 的第一种驱逐策略为软驱逐（soft eviction）。由于节点资源的耗用情况可能是临时性的波动，通常在几十秒后就会恢复。因此，当发现资源耗用达到设定阈值时，不应立即触发驱逐操作，而是应该观察一段时间后再做决定。与软驱逐相关的 Kubelet 配置参数如下：

- --eviction-soft：软驱逐触发条件。例如，可用内存（memory.available）< 500Mi，可用磁盘空间（nodefs.available）< 10% 等等。
- --eviction-soft-grace-period：软驱逐宽限期。例如，memory.available=2m30s，即可用内存 < 500Mi，并持续 2m30s 后，才真正开始驱逐 Pod。
- --eviction-max-pod-grace-period：最大 Pod 优雅终止宽限期，该参数决定给 Pod 多少时间来优雅地关闭（graceful shutdown）。

Kubelet 的第二种驱逐策略为硬驱逐（hard eviction），该策略主要关注节点的稳定性，以防止资源耗尽导致节点不可用。硬驱逐的执行相当直接，当 Kubelet 发现节点资源的耗用情况达到硬驱逐阈值时，会立即杀死相应的 Pod。与硬驱逐相关的 Kubelet 配置参数只有一个，即 --eviction-hard，其配置方式与 --eviction-soft 一致，笔者在此不再赘述。

此外，当 Kubelet 驱逐一部分 Pod 后，节点的资源耗用情况可能在一段时间后再次达到阈值，从而重新触发新的驱逐，形成循环，这种问题称为“驱逐波动”。为避免因资源紧张而频繁触发驱逐操作，Kubelet 预留了以下参数：

- --eviction-minimum-reclaim：该参数决定每次驱逐时至少要回收的资源量，以停止驱逐操作。
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









