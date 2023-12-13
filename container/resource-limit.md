# 7.6 资源限制模型

Kubernetes 将管理的物理资源抽象成指定的类型和对应的计量单位，这些资源分为以下两类：

- 可压缩资源：例如 CPU，当此类资源超限时，Pod 中进程使用 CPU 会被限制，应用表现变得卡顿，但不会被杀掉。
- 不可压缩资源：例如内存、显存（GPU）等，当此类资源不足时，应用会产生 OOM 问题（Out of Memory，内存溢出）并被杀掉。

我们继续再看看这些资源的计量方式，首先是 CPU 资源，在 Kubernetes 中，一个 CPU 等于 1 个物理 CPU 核 或者 1 个虚拟核，取决于节点是一台物理主机还是运行在某物理主机上的虚拟机。CPU 的计量单位为毫核(m)，一个 Node 节点 CPU 核心数量乘以 1000，得到的就是该 Node 节点总的 CPU 总数量。例如一个 Node 节点有两个核，那么该 Node 节点的 CPU 总量为 2000m，无论容器运行在单核、双核机器上，500m CPU 表示的是大约相同的计算能力。

CPU 资源的设定也可以表达带小数 CPU 的请求。当设置为 0.5 时，所请求的 CPU 资源为 1.0 CPU 时的一半。对于 CPU 资源单位，数量表达式 0.1 等价于表达式 100m，可以看作 “100 millicpu”。 

其次是内存类型的资源，内存的约束和请求以字节为单位，你可以使用普通的不带单位的字节，或者带有具体单位的数字来表示内存：E、P、T、G、M、k。 你也可以使用对应的 2 的幂数：Ei、Pi、Ti、Gi、Mi、Ki。例如，以下表达式所代表的是大致相同的值：

```plain
128974848, 129e6, 129M, 123Mi
```

注意 `123 Mi = 123*1204*1204B = 129 M`

什么是 2 的幂数？举个例子 M（（Megabyte））和 Mi（Mebibyte） ，1M 就是`1*1000*1000` 字节，1Mi 就是`1*1024*1024`字节，所以 1M < 1Mi，显然带这个小 i 的更准确。


以上的资源信息有 Node 节点中的 kubelet 负责上报，节点内定义了固定的资源总和、Kubernetes 可分配资源信息等。


## 容器资源限制

Kubernetes 通过配置 Pod 内容器的 requests (资源需求）和 limits (资源限制) 属性分配内存和 CPU 资源，以防止资源匮乏并调整云成本。

- **requests** 容器需要的最小资源量。举例来讲，对于一个 Spring Boot 业务容器，这里的 requests 必须是容器镜像中 JVM 虚拟机需要占用的最少资源。
- **limits** 容器最大可以消耗的资源上限，防止过量消耗资源导致资源短缺甚至宕机。

<div  align="center">
	<img src="../assets/requests-limits.png" width = "500"  align=center />
</div>


每一个容器都可以独立地设定相应的 requests 和 limits 。这 2 个参数通过每个容器 resources 字段进行设置。
，当设置 limits 而没有设置 requests 时，Kubernetes 默认令 requests 等于 limits 。

如下，一个容器的资源限制设定，该资源对象指定容器进程需要 50/1000 核（5%）才能被调度，并且允许最多使用 100/1000 核（10%）。

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

## 服务质量 Qos 等级

kubernetes 根据 Pod 内容器内 requests、limits 的设置定义了几类不同的 Pod QoS 级别。在一个超用 （Over Committed，容器 limits 总和大于系统容量上限）系统中，由于容器负载波动会导致操作系统资源不足，最终可能导致部分容器被杀掉。QoS 级别决定了 kubernetes 处理这些 pod 的方式

K8s 将容器划分为 3 个 Qos 等级，这种优先级依次递减。

| QoS 级别| QoS 介绍 |
|:--|:--|
|Guaranteed| Pod 中的每个容器，包含初始化容器，必须指定内存和 CPU 的 requests 和 limits，并且两者要相等 |
|Burstable| Pod 不符合 Guaranteed QoS 类的标准；Pod 中至少一个容器具有内存或 CPU requests |
|BestEffort | Pod 中的容器必须没有设置内存和 CPU requests 或 limits |


<div  align="center">
	<img src="../assets/qos.webp" width = "600"  align=center />
</div>


我们以内存资源为例，当 Node 节点上内存资源不够的时：

- QoS 级别是 BestEffort 的 Pod 会最先被 kill 掉
- 如果 BestEffort 级别的 POD 已经被 kill 掉了，则继续查找 Burstable 级别的 Pod kill 掉。
- 如果 BestEffort 和 Burstable 的 Pod 都已经被 kill 掉，那么继续查找 Guaranteed 的 Pod，并且这些 pod 使用的内存已经超出了 limits 限制，这些被找到的 pod 会被 kill 掉

## 集群稳定性建议

集群的稳定性直接决定了其上运行的业务应用的稳定性。而临时性的资源短缺往往是导致集群不稳定的主要因素。

那么如何提高集群的稳定性呢？一方面，可以通过编辑 Kubelet 配置文件来预留一部分系统资源，从而保证当可用计算资源较少时 kubelet 所在节点的稳定性。 这在处理如内存和硬盘之类的不可压缩资源时尤为重要。另一方面，通过合理地设置 pod 的 QoS 可以进一步提高集群稳定性：不同 QoS 的 Pod 具有不同的 OOM 分数，当出现资源不足时，集群会优先 Kill 掉 Best-Effort 类型的 Pod ，其次是 Burstable 类型的 Pod ，最后是 Guaranteed 类型的 Pod 。因此，如果资源充足，可将 QoS pods 类型均设置为 Guaranteed 。用计算资源换业务性能和稳定性，减少排查问题时间和成本。同时如果想更好的提高资源利用率，业务服务也可以设置为 Guaranteed ，而其他服务根据重要程度可分别设置为 Burstable 或 Best-Effort 。