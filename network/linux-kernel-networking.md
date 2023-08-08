# 2.2 Linux 内核网络

本章节从理论学习、技术铺垫的角度介绍 Linux 内核数据包处理流程，熟悉 Linux 内核网络有助于我们理解上层网络模型、负载均衡等各类应用。


<div  align="center">
	<img src="../assets/Netfilter-packet-flow.svg" width = "800"  align=center />
	<p>图 2-1 Packet flow in Netfilter and General Networking</p>
</div>

从图 2-1 可以看到 Linux 内核如何处理通过不同协议栈路径上的数据包。
对其分析总结，Linux 内核对数据包的处理可以分成四个部分：XDP、netfilter、traffic control、conntrack。

- XDP (eXpress Data Path，快速数据路径) 是 Linux 内核中提供高性能、可编程的网络数据包处理框架。它使得 Linux 内核能够在数据报文到达 L2（网卡驱动层）时就对其进行针对性的高速处理，而无需再 “循规蹈矩” 地进入到内核网络协议栈中处理。

- netfilter（数据包处理框架） 功能包括数据包过滤、修改、SNAT/DNAT 等，netfilter 框架在内核协议栈的不同位置实现了多个 hook 点，通过在 hook 点注册的处理函数，以及上层应用（iptables、ebtables）配置等，可以对网络层（network Layer）IP 数据包，以及链路层（Link Layer）以太网帧进行处理。

- conntrack（连接跟踪） 允许内核跟踪所有逻辑网络连接或会话，从而关联可能构成该连接的所有数据包。conntrack 是 NAT 以及有状态防火墙等实现基础。


