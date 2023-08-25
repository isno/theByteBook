# 2.2 Linux 内核网络框架分析

本章节从理论学习、技术铺垫的角度介绍 Linux 内核数据包处理流程，熟悉 Linux 内核网络有助于我们理解上层网络模型、负载均衡等各类应用。

<div  align="center">
	<img src="../assets/Netfilter-packet-flow.svg" width = "800"  align=center />
	<p>图 2-3 Packet flow in Netfilter and General Networking</p>
</div>

从图 2-1 可以看到 Linux 内核如何处理通过不同协议栈路径上的数据包。
对其分析总结，Linux 内核对数据包的处理可以分成四个部分：XDP、netfilter、traffic control、conntrack。

- XDP (eXpress Data Path，快速数据路径) 是 Linux 内核中提供高性能、可编程的网络数据包处理框架。它使得 Linux 内核能够在数据报文到达 L2（网卡驱动层）时就对其进行针对性的高速处理，而无需再 “循规蹈矩” 地进入到内核网络协议栈中处理。

- netfilter（数据包处理框架）是 Linux 内核中的数据包处理框架，netfilter 在内核协议栈的不同位置实现了 5 个 hook 点，其它内核模块(例如 iptables、IPVS 等)可以向这些 hook 点注册处理函数，当数据包经过这些 hook 点时，注册处理函数被依次调用，进而实现对数据包过滤、修改、SNAT/DNAT 等各类功能。

- conntrack（连接跟踪） 允许内核跟踪所有逻辑网络连接或会话，从而关联可能构成该连接的所有数据包。conntrack 是 NAT 以及有状态防火墙等实现基础。

## netfilter 的应用示例

我们以 Kubernetes 网络模型说明 netfilter 的作用，如图 2-4 示例，当一个 Pod 跨 Node 进行通信时，数据包从 Pod 网络 Veth 接口发送到 cni0 虚拟网桥，进入主机协议栈之后，首先会经过 PREROUTING hook，调用相关的链做 DNAT，经过 DNAT 处理后，数据包目的地址变成另外一个 Pod 地址，再继续转发至 eth0，发给正确的集群节点。

<div  align="center">
	<img src="../assets/netfilter-k8s.png" width = "550"  align=center />
	<p>图 2-4 kubernetes 网络模型</p>
</div>




