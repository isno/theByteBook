# QoS

Kubernetes 抽象了两个概念用来描述容器资源的分配。

- **requests** 容器需要的最小资源量。举例来讲，对于一个 Spring Boot 业务容器，这里的 requests 必须是容器镜像中 JVM 虚拟机需要占用的最少资源。
- **limits** 容器最大可以消耗的资源上限，防止过量消耗资源导致资源短缺甚至宕机。

Pod 是由一到多个容器组成，所以资源的需求作用在容器上的。如下图所示，每一个容器都可以独立地通过 resources 属性设定相应的 requests 和 limits，

<div  align="center">
	<img src="../assets/requests-limits.png" width = "500"  align=center />
</div>

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

容器的资源调度以 requests 为准。有的 Pod 内部进程在初始化启动时会提前开辟出一段内存空间。比如 JVM 虚拟机在启动的时候会申请一段内存空间，如果内存 requests 指定的数值小于 JVM 虚拟机向系统申请的内存，导致内存申请失败（ oom-kill ），从而 Pod 出现不断地失败重启。

## 服务质量 Qos 等级

kubernetes 根据 Pod 内容器内 requests、limits 的设置定义了几类不同的 Pod QoS 级别。在一个超用 （Over Committed，容器 limits 总和大于系统容量上限）系统中，由于容器负载波动会导致操作系统资源不足，最终可能导致部分容器被杀掉。QoS 级别决定了 kubernetes 处理这些 pod 的方式

K8s 将容器划分为 3 个 Qos 等级，这种优先级依次递减。

| QoS 级别| QoS 介绍 |
|:--|:--|
|Guaranteed| Pod 中的每个容器，包含初始化容器，必须指定内存和 CPU 的 requests 和 limits，并且两者要相等 |
|Burstable| Pod 不符合 Guaranteed QoS 类的标准；Pod 中至少一个容器具有内存或 CPU requests |
|BestEffort | Pod 中的容器没有设置内存和 CPU requests 或 limits |

<div  align="center">
	<img src="../assets/qos.webp" width = "600"  align=center />
</div>

以内存资源为例，当 Node 节点上内存资源不足时：

- QoS 级别是 BestEffort 的 Pod 最先被 kill 掉。
- 如果 BestEffort 级别的 Pod 已经被 kill 掉了，则继续查找 Burstable 级别的 Pod kill 掉。
- 如果 BestEffort 和 Burstable 的 Pod 都已经被 kill 掉，那么继续查找 Guaranteed 的 Pod，并且这些 pod 使用的内存已经超出了 limits 限制，这些被找到的 pod 会被 kill 掉

集群的稳定性直接决定了其上运行的业务应用的稳定性。而临时性的资源短缺往往是导致集群不稳定的主要因素。

那么如何提高集群的稳定性呢？一方面，可以通过编辑 Kubelet 配置文件来预留一部分系统资源，从而保证当可用计算资源较少时 kubelet 所在节点的稳定性。 这在处理如内存和硬盘之类的不可压缩资源时尤为重要。另一方面，通过合理地设置 pod 的 QoS 可以进一步提高集群稳定性：不同 QoS 的 Pod 具有不同的 OOM 分数，当出现资源不足时，集群会优先 Kill 掉 Best-Effort 类型的 Pod ，其次是 Burstable 类型的 Pod ，最后是 Guaranteed 类型的 Pod 。