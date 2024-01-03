# 使用 clilium 配置网络

里面介绍到 Kubernetes Service 性能和扩展性问题 默认的 Kubernetes 的 Service 实现 kube-proxy，它是使用了 iptables 去配置 Service IP 和负载均衡：


如上图所示： 负载均衡过程的 iptables 链路长，导致网络延时显著增加，就算是 IPVS 模式也是绕不开 iptables 的调用； 扩展性差。iptables 规则同步是全量刷的，Service 和 Pod 数量多了，一次规则同步都得接近 1s；Service 和 Pod 数量多了之后，数据链路性能大幅降低。


NetworkPolicy 性能和扩展性问题 NetworkPolicy 是 Kubernetes 控制 Pod 和 Pod 间是否允许通信的规则。目前主流的 NetworkPolicy 实现基于 iptables 实现，同样有 iptables 的扩展性问题： iptables 线性匹配，性能不高, Scale 能力差 iptables 线性更新，更新速度慢


cilium和其他的cni组件最大的不同在于其底层使用了ebpf技术，而该技术对于Linux的系统内核版本有较高的要求

cilium官方还给出了一份列表描述了各项高级功能对内核版本的要求：

|  特性 |  最低版本 |  
|---|---|
| Bandwidth Manager（带宽管理器）  | >= 5.1  |
|  Egress Gateway |   |
| VXLAN Tunnel Endpoint (VTEP) Integration  |   | 
|WireGuard Transparent Encryption||
|Full support for Session Affinity||
|BPF-based proxy redirection||
|Socket-level LB bypass in pod netns||
|L3 devices||
|BPF-based host routing||
|IPv6 BIG TCP support||
|IPv4 BIG TCP support||