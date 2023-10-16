# Kube-proxy

Kube-proxy 是 kubernetes 工作节点上的一个网络代理组件，运行在每个 Node 节点上。Kube-proxy 维护节点上的网络规则，使发往 Service 的流量（通过 ClusterIP 和端口）负载均衡到正确的后端 Pod。

## Kube-proxy 的工作模式

目前 Kube-proxy 支持两种代理模式：iptables、ipvs。




从 iptables 的分析来看，集群内 iptables 规则的数量和集群内 Pod 数据成正比。 不难想象，当集群 Pod 数量很大的情况下，iptables 规则数量很大，而 Linux 系统不断地刷新成百上千条 iptables 规则会大量消耗 CPU 资源，甚至引起宿主机的卡死。

虽然基于 iptables 的代理在性能上优于基于用户空间的代理，但在集群服务过多的情况下也会导致性能严重下降。

本质上，这是因为 iptables 判决是基于链的，它是一个复杂度为 O(n) 的线性算法。iptables 的一个好的替代方案是 IPVS——内核中的 L4 负载均衡器，它在底层使用 ipset（哈希实现），因此复杂度为 O(1)。