# 7.5.2 资源描述以及 QoS

在 Kubernetes 里，Pod 是最小的原子调度单位。这也就意味着，所有跟调度和资源管理相关的属性都应该是属于 Pod 对象的字段。

## 描述资源的分配

Kubernetes 抽象了两个概念用来描述 Pod 资源的分配：

- **requests** 是容器请求要使用的资源，kubernetes 会保证 Pod 能使用到这么多的资源。requests 资源是调度的依据，只有当节点上的可用资源大于 Pod 请求的各种资源时，调度器才会把 pod 调度到该节点上。
- **limits** 容器最大可以消耗的资源上限，防止过量消耗资源导致资源短缺甚至宕机。实际会配置到 cgroups 对应任务的 /sys/fs/cgroup.. 文件中

Pod 是由一到多个容器组成，所以资源的需求作用在容器上的。如下图所示，每一个容器都可以独立地通过 resources 属性设定相应的 requests 和 limits，

:::center
  ![](../assets/requests-limits.png)<br/>
:::


笔者举例子说明容器的资源限制设定。如下代码所示，该资源对象指定容器进程需要 50/1000 核（5%）才能被调度，并且允许最多使用 100/1000 核（10%）。

```plain
container:
	resources:  
	    requests:
	        cpu: 50m
	        memory: 50Mi
	   limits:    
	        cpu: 100m
	        memory: 100Mi
```

Requests 和 limits 的配置除了表明资源情况和限制资源使用之外，还有一个隐藏的作用：它决定了 Pod 的 QoS 等级。

## 服务质量 Qos 等级

在一个超用 （Over Committed，容器 limits 总和大于系统容量上限）系统中，由于容器负载波动会导致操作系统资源不足，最终可能导致部分容器被杀掉，QoS 级别决定了 kubernetes 处理这些 pod 的方式。Kubernetes 将容器划分为 3 个 Qos 等级，优先级依次递减：

- **Guaranteed**：优先级最高，可以考虑数据库应用或者一些重要的业务应用。除非 pods 使用超过了它们的 limits，或者节点的内存压力很大而且没有 QoS 更低的 pod，否则不会被杀死。
- **Burstable**：这种类型的 pod 可以多于自己请求的资源（上限有 limit 指定，如果 limit 没有配置，则可以使用主机的任意可用资源），但是重要性认为比较低，可以是一般性的应用或者批处理任务。
- **Best Effort**：优先级最低，集群不知道 pod 的资源请求情况，调度不考虑资源，可以运行到任意节点上（从资源角度来说），可以是一些临时性的不重要应用。pod 可以使用节点上任何可用资源，但在资源不足时也会被优先杀死。

Pod 的 requests 和 limits 是如何对应到这三个 QoS 等级上，可以用下图概括。

:::center
  ![](../assets/qos.webp)<br/>
:::

从上面看到，如果不配置 requests 和 limits，pod 的 QoS 等级是最低的，所以推荐一定按照需求给 Pod 配置 requests 和 limits 参数。如此，不仅可以让调度更准确，也能让系统更加稳定。

## 驱逐

理想的情况下资源完全够用，而且应用也都使用规范内的资源。但现实肯定不会这么简单，例如一个请求响应式的系统，遇到晚高峰、大促，会导致集群资源产生大的波动。这个情况我们就要尽力保证整个集群可用，并尽量减少应用的损失。

Pod 的驱逐是在 kubelet 中实现的，因为 kubelet 能动态地感知到节点上资源使用率实时的变化情况。其核心的逻辑是：kubelet 实时监控节点上各种资源的使用情况，一旦发现某个不可压缩资源出现要耗尽的情况，就会主动终止节点上的 pod，让节点能够正常运行。被终止的 pod 所有容器会停止，状态会被设置为 failed。

### 驱逐触发条件

有三种情况会触发驱除：

1. 实际内存不足。
2. 节点文件系统的可用空间（文件系统剩余大小和 inode 数量）不足。
3. 以及镜像文件系统的可用空间（包括文件系统剩余大小和 inode 数量）不足。

有了触发的条件，另外一个问题就是触发的时机，也就是到什么程度需要触发驱逐程序。Kubernetes 支持用户自主配置，且有两种配置模式：按照百分比和按照绝对数量。比如对于一个 32G 内存的节点当可用内存少于 10% 时启动驱逐程序，可以配置 memory.available<10% 或者 memory.available<3.2Gi。

### 驱除的两种方式

驱除 Pod 是具有风险性的行为，会导致局部服务不可用，因此必须谨慎对待。有时候只是突发性的内存增高，可能几十秒之后就会恢复。另外一个情况内存的使用率持续过高，譬如高于 95%，这个时候就不应该再过多的评估可考虑，而是紧急启用驱除机制，防止内存使用率继续增大导致系统完全崩溃。

为此，kubernetes 引入了两种驱除策略：soft eviction（软驱除） 和 hard eviction（硬驱除）。

软驱逐还需要**配置一个时间指定软驱逐条件持续多久才触发**，也就是说 kubelet 在发现资源使用率达到设定的阈值之后，并不会立即触发驱逐程序，而是继续观察一段时间，如果资源使用率高于阈值的情况持续一定时间，才开始驱逐。并且驱逐 pod 的时候，会遵循 grace period ，等待 Pod 处理完清理逻辑。

和软驱逐相关的启动参数是：

- --eviction-soft：软驱逐触发条件，比如 memory.available<1Gi
 - --eviction-sfot-grace-period：触发条件持续多久才开始驱逐，比如 memory.available=2m30s
 - --eviction-max-pod-grace-period：kill pod 时等待 grace period 的时间让 pod 做一些清理工作，如果到时间还没有结束就做 kill

前面两个参数必须同时配置，软驱逐才能正常工作；后一个参数会和 pod 本身配置的 grace period 比较，选择较小的一个生效。

硬驱逐更加直接干脆，**kubelet 发现节点达到配置的硬驱逐阈值后，立即开始驱逐程序，并且不会遵循 grace period**，也就是说立即强制杀死 pod。对应的配置参数只有一个 --evictio-hard，可以选择上面表格中的任意条件搭配。

设置这两种驱逐程序是为了平衡节点稳定性和对 pod 的影响，软驱逐照顾到了 pod 的优雅退出，减少驱逐对 pod 的影响；而硬驱逐则照顾到节点的稳定性，防止资源的快速消耗导致节点不可用。

### 驱逐哪些 Pod ？

一个节点上会运行多个 pod，驱逐所有的 pods 显然是不必要的，因此要做出一个抉择：在节点上运行的所有 pod 中选择一部分来驱逐。虽然这些 pod 乍看起来没有区别，但是它们的地位是不一样的，正如乔治·奥威尔在《动物庄园》的那句话：

:::tip
所有动物生而平等，但有些动物比其他动物更平等。
:::

Pod 也是不平等的，有些 pod 要比其他 pod 更重要。只管来说，系统组件的 pod 要比普通的 pod 更重要，另外运行数据库的 pod 自然要比运行一个无状态应用的 pod 更重要。kubernetes 又是怎么决定 pod 的优先级的呢？这个问题的答案就藏在我们之前已经介绍过的内容里：pod requests 和 limits、优先级（priority），以及 pod 实际的资源使用。

简单来说，kubelet 会根据以下内容对 pod 进行排序：pod 是否使用了超过请求的紧张资源、pod 的优先级、然后是使用的紧缺资源和请求的紧张资源之间的比例。具体来说，kubelet 会按照如下的顺序驱逐 pod：

- 使用的紧张资源超过请求数量的 BestEffort 和 Burstable pod，这些 pod 内部又会按照优先级和使用比例进行排序
- 紧张资源使用量低于 requests 的 Burstable 和 Guaranteed 的 pod 后面才会驱逐，只有当系统组件（kubelet、docker、journald 等）内存不够，并且没有上面 QoS 比较低的 pod 时才会做。执行的时候还会根据 priority 排序，优先选择优先级低的 pod

### 防止驱逐波动

当触发驱除后，如果 kubelet 驱逐一部分 pod，让资源使用率低于阈值就停止，那么很可能过一段时间资源使用率又会达到阈值，从而再次出发驱逐，如此循环往复...。

为了处理这种问题，我们可以使用 --eviction-minimum-reclaim 解决，这个参数配置每次驱逐至少清理出来多少资源才会停止。

另外一个波动情况是这样的：Pod 被驱逐之后并不会从此消失不见，常见的情况是 kubernetes 会自动生成一个新的 pod 来取代，并经过调度选择一个节点继续运行。如果不做额外处理，有理由相信 pod 选择原来节点的可能性比较大（因为调度逻辑没变，而它上次调度选择的就是该节点）。

无论如何，如果被驱逐的 pod 再次调度到原来的节点，很可能会再次触发驱逐程序，然后 pod 再次被调度到当前节点，循环往复....

这个问题解决也很简单，延缓 kubelet 上报资源状态的。--eviction-pressure-transition-period 参数可以指定 kubelet 多久才上报节点的状态，因为默认的上报状态周期比较短，频繁更改节点状态会导致驱逐波动。

```
–eviction-soft=memory.available<80%,nodefs.available<2Gi \
–eviction-soft-grace-period=memory.available=1m30s,nodefs.available=1m30s \
–eviction-max-pod-grace-period=120 \
–eviction-hard=memory.available<500Mi,nodefs.available<1Gi \
–eviction-pressure-transition-period=30s \
--eviction-minimum-reclaim="memory.available=0Mi,nodefs.available=500Mi,imagefs.available=2Gi"
```




