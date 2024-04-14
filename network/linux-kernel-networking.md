# 3.2 Linux 内核网络框架

近几年由于容器、可观测技术等技术的发展，对于工程师而言，或者出于参考借鉴的目的，或者从事网络开发/维护，了解 Linux 内核网络协议栈都是绕不开的点。

Linux 网络协议栈的处理是一套相对固定和封闭的流程，整套处理过程中，除了网络设备层能看到一点点程序以设备的形式介入处理的空间外，其他过程似乎就没有什么可提供程序插手的空间了。然而事实并非如此，从 Linux 内核 2.4 版本起，内核就开放了一套通用的，可提供代码干预数据在协议栈流转的过滤框架 —— Netfilter。

:::tip Netfilter

Netfilter 是 Linux 内核中的一个软件框架，用于管理网络数据包。不仅具有网络地址转换（NAT）的功能，也具备数据包内容修改、以及数据包过滤等防火墙功能。

:::
如图 3-3 所示，来自 Netfilter 项目的《网络数据包通过 Netfilter 时的工作流向》[^1]，全面的介绍了内核网络设计原理，包含了 XDP、Netfilter 和 traffic control 部分。是参考内核协议栈各 hook 点位置和 iptables 规则优先级的经典配图。

<div  align="center">
	<img src="../assets/Netfilter-packet-flow.svg" width = "800"  align=center />
	<p>图 3-3 网络数据包通过 Netfilter 时的工作流向</p>
</div>

Netfilter 实际上就是一个数据包过滤器框架，Netfilter 在网络包收发以及路由的「管道」中，一共切了 5 个口（hook），分别是：

- PREROUTING：接收到的包进入协议栈后立即触发此 hook，在进行任何路由判断（将包发往哪里）之前。
- LOCAL_IN：接收到的包经过路由判断，如果目的是本机，将触发此 hook。
- FORWARD：接收到的包经过路由判断，如果目的是其他机器，将触发此 hook。
- LOCAL_OUT：本机产生的准备发送的包，在进入协议栈后立即触发此 hook。
- POST_ROUTING：本机产生的准备发送的包或者转发的包，在经过路由判断之后，将触发此 hook。

其它内核模块(例如 iptables、IPVS 等)可以向这些 hook 点注册处理的钩子函数。每当有数据包留到网络层，就会自动触发内核模块注册在这里的钩子函数，这样程序代码就能够通过钩子函数来干预 Linux 的网络通信，进而实现对数据包过滤、修改、SNAT/DNAT 等各类功能。

如图 3-4 所示，Kubernetes 集群服务的本质其实就是负载均衡或反向代理。实现反向代理，归根结底就是做 DNAT，即把发送给集群服务的 IP 地址和端口的数据包，修改成具体容器组的 IP 地址和端口。

<div  align="center">
	<img src="../assets/k8s-service.svg" width = "450"  align=center />
	<p>图 3-4 Kubernetes 服务的本质</p>
</div>

如图 3-5 Kubernetes 网络模型说明示例，当一个 Pod 跨 Node 进行通信时，数据包从 Pod 网络 Veth 接口发送到 cni0 虚拟网桥，进入主机协议栈之后，首先会经过 PREROUTING hook，调用相关的链做 DNAT，经过 DNAT 处理后，数据包目的地址变成另外一个 Pod 地址，再继续转发至 eth0，发给正确的集群节点。

<div  align="center">
	<img src="../assets/netfilter-k8s.svg" width = "550"  align=center />
	<p>图 3-5 kubernetes 网络模型</p>
</div>

对 Linux 内核网络基本了解之后，我们再来看看 Netfilter 的上层应用 iptables。

[^1]: 参见 https://en.wikipedia.org/wiki/Netfilter
