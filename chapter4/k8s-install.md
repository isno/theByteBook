# 最佳Kubernetes集群部署实践

在本文中，笔者将带您了解K8S高可用方案设计原理，在了解原理的基础上，将基于 K8S v1.25.6版本 堆叠etcd方式部署集群。

在LoadBalancer的高可用方案上选择PureLB和Calico结合bird实现BGP路由可达的K8S集群部署。

在本案中使用kubeadm进行集群的部署，容器方案使用 Docker，针对kube-proxy组件并启用ipvs进行网络包的性能优化。

在部署之前，我们先来看一下 K8S 高可用方面的知识。

## K8S高可用方案

K8S集群高可用的关键在于Master节点的高可用，官方推荐了两种高可用的拓扑方式：堆叠etcd、外部etcd。在这两种架构中，有两个关键的地方：etcd、load balancer。也就是说，只要完成上述两者的高可用，整个Kubernetes集群即达到了高可用的目的。


### 使用堆叠（stacked）控制平面节点，其中 etcd 节点与控制平面节点共存
<div  align="center">
	<p>图：堆叠etcd方式</p>
	<img src="/assets/chapter4/k8s.ha.png" width = "550"  align=center />
</div>

该方案的特点是:

etcd 分布式数据存储集群堆叠在 kubeadm 管理的控制平面节点上，作为控制平面的一个组件运行。

每个控制平面节点运行 kube-apiserver、kube-scheduler 和 kube-controller-manager 实例。 kube-apiserver 使用负载均衡器暴露给工作节点。

每个控制平面节点创建一个本地 etcd 成员（member），这个 etcd 成员只与该节点的 kube-apiserver 通信。 这同样适用于本地 kube-controller-manager 和 kube-scheduler 实例。


这种拓扑将控制平面和 etcd 成员耦合在同一节点上。相对使用外部 etcd 集群， 设置起来更简单，而且更易于副本管理。

然而，堆叠集群存在耦合失败的风险。如果一个节点发生故障，则 etcd 成员和控制平面实例都将丢失， 并且冗余会受到影响。你可以通过添加更多控制平面节点来降低此风险。

因此，你应该为 HA 集群运行至少三个堆叠的控制平面节点。


### 使用外部 etcd 节点，其中 etcd 在与控制平面不同的节点上运行 

<div  align="center">
	<p>图：外部etcd方式</p>
	<img src="/assets/chapter4/k8s.ha.2.png" width = "550"  align=center />
</div>

该方案的特点是：

etcd 分布式数据存储集群在独立于控制平面节点的其他节点上运行。

就像堆叠的 etcd 拓扑一样，外部 etcd 拓扑中的每个控制平面节点都会运行 kube-apiserver、kube-scheduler 和 kube-controller-manager 实例。 同样，kube-apiserver 使用负载均衡器暴露给工作节点。但是 etcd 成员在不同的主机上运行， 每个 etcd 主机与每个控制平面节点的 kube-apiserver 通信。

这种拓扑结构解耦了控制平面和 etcd 成员。因此它提供了一种 HA 设置， 其中失去控制平面实例或者 etcd 成员的影响较小，并且不会像堆叠的 HA 拓扑那样影响集群冗余。

但此拓扑需要两倍于堆叠 HA 拓扑的主机数量。 具有此拓扑的 HA 集群至少需要三个用于控制平面节点的主机和三个用于 etcd 节点的主机。


### 方案采用结论

对于以上两种高可用的拓扑方式，区别主要是 etcd 是否单独安装，笔者对比了两种部署方式，总结如下：

使用堆叠方式：

- 所需硬件资源少
- 部署简单、利于管理
- 横向扩展容易
- 缺点在于一台宿主机挂了，Master节点和etcd就少了一套，会大大降低集群冗余度和健壮性 （所以一般部署 3、5奇数 个 Master 节点）

使用外部方式：

- Master节点和etcd解耦，Master节点挂了后不影响etcd，集群健壮性增强
- 缺点是硬件资源几乎2倍于堆叠方案，并且运维复杂度会变高

从笔者的个人观点来看，横向扩展的便捷性以及对于硬件的需求更倾向于使用 堆叠方式。而且使用 3 个 Master节点方式部署，也可以保证高可用性。


### kube-apiserver高可用

在官方的拓扑图中，除了etcd以外很容易忽略load balancer这个节点。

kube-apiserver节点通过前置负载均衡器load balancer实现高可用，常用的思路或者方案大致归纳有以下几种：

**外部负载均衡器**

此类的方案通过HAproxy实现kube-apiserver的高可用并且通过Keepalived方式确保HAproxy自身的高可用，Keepalived的相关原理已在 第三章介绍过，本篇中不再复述。

**网络层做负载均衡**

比如在Master节点上用BGP做ECMP，或者在Node节点上用iptables做NAT都可以实现。采用这一方案不需要额外的外部服务，但是对网络配置有一定的要求。


### kube-controller-manager 与 kube-scheduler 高可用

这两项服务是Master节点的组件，他们的高可用相对容易，仅需要运行多份实例即可。

Kubernetes自身通过leader election机制保障当前只有一个副本是处于运行状态。

至于leader选举的机制，简单来说是：多个kube-controller-manager与kube-scheduler的副本对 endpoint 锁资源做抢占，谁能抢到并将自己的信息写入 endpoint的 annotation 中，谁就成为了leader，leader需要在可配置的一个间隔时间内更新消息，其他节点也能看见当前的leader和过期时间。

当过期时间到并且leader没有更新后，其他副本会尝试去获取锁，去竞争leader，直到自己成为leader。


## ipvs VS iptables

Kube-proxy 是 kubernetes 工作节点上的一个网络代理组件，运行在每个节点上。

Kube-proxy维护节点上的网络规则，实现了Kubernetes Service 概念的一部分 。它的作用是使发往 Service 的流量（通过ClusterIP和端口）负载均衡到正确的后端Pod。


kube-proxy 有三种运行模式，每种都有不同的实现技术：userspace、iptables 或者 ipvs。

相较于iptables，ipvs 旨在均衡许多服务的负载, 它具有优化的API和优化的查找例程，而不是一系列顺序规则，ipvs 模式下kube-proxy的连接处理的计算复杂度为O(1)。换句话说，在大多数情况下，其连接处理性能将保持恒定，而与集群大小无关。

与 iptables 模式下的 kube-proxy 相比，ipvs 模式下的 kube-proxy 重定向通信的延迟要短，并且在同步代理规则时具有更好的性能。 与其他代理模式相比，IPVS 模式还支持更高的网络流量吞吐量。

### 使用总结

对于iptables和ipvs 模式，kube-proxy的响应时间开销与建立连接相关，而不是与在这些连接上发送的数据包或请求的数量有关。

这是因为Linux使用的连接跟踪（conntrack）能够非常有效地将数据包与现有连接进行匹配。如果数据包在conntrack中匹配，则无需检查kube-proxy的iptables或ipvs规则即可确定该如何处理。

在集群中不超过1000个服务的时候，iptables 和 ipvs 并无太大的差异。而且由于iptables 与网络策略实现的良好兼容性，iptables 是个非常好的选择。

在超过 1000 节点的规模下，建议您使用ipvs 模式，会有更好的性能表现, 除去性能优势，ipvs 模式还有个好处就是具有更多的负载均衡算法可供选择。


