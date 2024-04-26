# QoS

Kubernetes 抽象了两个概念用来描述容器资源的分配。

- **requests** 是容器请求要使用的资源，kubernetes 会保证 Pod 能使用到这么多的资源。requests 资源是调度的依据，只有当节点上的可用资源大于 Pod 请求的各种资源时，调度器才会把 pod 调度到该节点上（如果 CPU 资源足够，内存资源不足，调度器也不会选择该节点）。
- **limits** 容器最大可以消耗的资源上限，防止过量消耗资源导致资源短缺甚至宕机。实际会配置到 cgroups 对应任务的 /sys/fs/cgroup.. 文件中

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

Requests 和 limits 的配置除了表明资源情况和限制资源使用之外，还有一个隐藏的作用：它决定了 Pod 的 QoS 等级。

## 服务质量 Qos 等级

在一个超用 （Over Committed，容器 limits 总和大于系统容量上限）系统中，由于容器负载波动会导致操作系统资源不足，最终可能导致部分容器被杀掉。QoS 级别决定了 kubernetes 处理这些 pod 的方式

K8s 将容器划分为 3 个 Qos 等级，这种优先级依次递减。

- Guaranteed：优先级最高，可以考虑数据库应用或者一些重要的业务应用。除非 pods 使用超过了它们的 limits，或者节点的内存压力很大而且没有 QoS 更低的 pod，否则不会被杀死
- Burstable：这种类型的 pod 可以多于自己请求的资源（上限有 limit 指定，如果 limit 没有配置，则可以使用主机的任意可用资源），但是重要性认为比较低，可以是一般性的应用或者批处理任务
- Best Effort：优先级最低，集群不知道 pod 的资源请求情况，调度不考虑资源，可以运行到任意节点上（从资源角度来说），可以是一些临时性的不重要应用。pod 可以使用节点上任何可用资源，但在资源不足时也会被优先杀死

Pod 的 requests 和 limits 是如何对应到这三个 QoS 等级上，可以用下图概括。

<div  align="center">
	<img src="../assets/qos.webp" width = "600"  align=center />
</div>

从上面看到，如果不配置 requests 和 limits，pod 的 QoS 竟然是最低的。所以推荐一定按照需求要给 pod 配置 requests 和 limits 参数，不仅可以让调度更准确，也能让系统更加稳定。

