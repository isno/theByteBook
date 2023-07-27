# 2.2 Linux 内核网络

本文从理论学习、技术铺垫的角度介绍 Linux 内核数据包处理原理。

netfilter 是 linux 内核中的数据包处理框架，netfilter 的功能包括数据包过滤、修改、SNAT/DNAT 等。netfilter 在内核协议栈的不同位置实现了 5 个 hook 点，其它内核模块(比如 ip_tables)可以向这些 hook 点注册处理函数，这样当数据包经过这些 hook 点时，其上注册的处理函数就被依次调用

<div  align="center">
	<img src="../assets/Netfilter-packet-flow.svg" width = "800"  align=center />
	<p>图 2-1 Packet flow in Netfilter and General Networking</p>
</div>

iptables 工作在网络层（network Layer）处理的是 IP 数据包。ebtables 工作在链路层 Link Layer，处理的是以太网帧。

一些代表 iptables 表和链的绿色小方框位于链路层, 这是为解决在链路层Bridge中处理IP数据包的问题而引入的 bridge_nf 。 搭建 k8s 环境要求 net.bridge.bridge-nf-call-iptables=1 