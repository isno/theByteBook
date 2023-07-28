# 2.2 Linux 内核网络

本章节从理论学习、技术铺垫的角度介绍 Linux Kernel 数据包处理原理。从图 2-1 可以看到 Linux Kernel 如何处理通过不同协议栈路径上的数据包。

<div  align="center">
	<img src="../assets/Netfilter-packet-flow.svg" width = "800"  align=center />
	<p>图 2-1 Packet flow in Netfilter and General Networking</p>
</div>

对 图 2-1 进行总结分析，Linux 内核对数据包的处理可以分成四个部分：XDP（kernel pass）、netfilter（数据包过滤）、traffic control（流量控制）、conntrack（连接跟踪）。

- XDP (eXpress Data Path) 是 Linux Kernel 中提供高性能、可编程的网络数据包处理框架。它使得 Linux Kernel 能够在数据报文到达 L2（网卡驱动层）时就对其进行针对性的高速处理，而无需再 “循规蹈矩” 地进入到 TCP/IP Stack。

- netfilter 的功能包括数据包过滤、修改、SNAT/DNAT 等，netfilter 框架在内核协议栈的不同位置实现了多个 hook 点，通过在 hook 点注册的处理函数，netfilter 可以对网络层（network Layer）IP 数据包，以及链路层（Link Layer）以太网帧进行处理。

- conntrack 允许内核跟踪所有逻辑网络连接或会话，从而关联可能构成该连接的所有数据包。conntrack 是 NAT 以及防火墙的实现基础。

## 2. netfilter


netfilter 是 linux 内核中的数据包处理框架，netfilter 的功能包括数据包过滤、修改、SNAT/DNAT 等。netfilter 框架在内核协议栈的不同位置实现了 5 个 hook 点，其它内核模块(比如 ip_tables)可以向这些 hook 点注册处理函数，这样当数据包经过这些 hook 点时，其上注册的处理函数就被依次调用。从图 2-1 中，可以清楚看到 netfilter 框架是如何处理通过不同协议栈路径上的数据包。



通过图 2-1 显示，netfilter 既可以处理网络层（network Layer）IP 数据包，也可以在链路层（Link Layer）处理以太网帧。链路层以太网帧由 bridge_netfilter（简称 bridge_nf ）hook 处理，我们看到在链路层（Link Layer）也有一些 iptables 的表和链，由此通过 bridge_nf hook，不管此数据包是发给主机本身，还是通过 Bridge 转发给虚拟机，iptables 都能完成过滤。

例如，搭建 k8s 环境要求设置 net.bridge.bridge-nf-call-iptables = 1，就是允许 iptables 对链路层的数据生效。

