# 2.2 Linux 内核网络框架分析

本章节从理论学习、技术铺垫的角度介绍 Linux 内核数据包处理流程，熟悉 Linux 内核网络有助于我们理解上层网络模型、负载均衡等各类应用。

<div  align="center">
	<img src="../assets/Netfilter-packet-flow.svg" width = "800"  align=center />
	<p>图 2-9 网络数据包流程和 Netfilter 框架</p>
</div>

从图 2-9 可以看到 Linux 内核如何处理通过不同协议栈路径上的数据包。我们对图中各个模块进行说明，图中有颜色的长方形方框表示 iptables 或 ebtables 的表和链，绿色小方框表示 network level，即 iptables 的表和链（用以处理 IP 数据包），蓝色小方框表示 bridge level，即 ebtables 的表和链（用以处理太网帧），由于处理以太网帧相对简单，因此链路层的蓝色小方框相对较少。

我们还注意到一些代表 iptables 表和链的绿色小方框位于链路层，这是为了解决在链路层 Bridge 中处理 IP 数据包而引入 bridge_nf 的原因，这也是安装 Kubernetes 要求开启 bridge-nf-call-iptables 的原因。

椭圆形的方框为 conntrack ，即 connection tracking，这是 netfilter 提供的连接跟踪机制，此机制允许内核“审查”通过此处的所有网络数据包，并能识别出此数据包属于哪个网络连接，conntrack 机制是 iptables 实现状态匹配(-m state)以及 NAT 的基础，它由单独的内核模块 nf_conntrack 实现。

图中左下方 bridge check 用于检测数据包从主机上的某个网络接口进入时，检查此网络接口是否属于某个 Bridge 的 port，如果是就会进入 Bridge 代码处理逻辑(下方蓝色区域bridge level), 否则就会送入网络层 Network Layer 处理。

图中下方中间位置的 bridging decision 类似普通二层交换机的查表转发功能，根据数据包目的 MAC 地址判断此数据包是转发还是交给上层处理。
图中中心位置的 routing decision 就是路由选择，根据系统路由表(ip route查看), 决定数据包是 forward 还是交给本地处理。

总的来看，不同 packet 有不同的 packet flow，packet 总是从主机的某个接口进入(左下方ingress), 然后经过 check、decision以及一系列表和链处理，最后，目的地或是主机上某应用进程或是需要从主机另一个接口发出(右下方 egress)。这里的接口即可以是物理网卡，也可以是虚拟网卡tun0 还可以是 Bridge 上的一个 port。


对图2-9 分析总结，Linux 内核对数据包的处理可以分成四个部分：XDP、netfilter、traffic control、conntrack。

- **XDP（eXpress Data Path，快速数据路径）** 是 Linux 内核中提供高性能、可编程的网络数据包处理框架。它使得 Linux 内核能够在数据报文到达 L2（网卡驱动层）时就对其进行针对性的高速处理，而无需再 “循规蹈矩” 地进入到内核网络协议栈中处理。
- **netfilter（数据包处理框架）** 是 Linux 内核中的数据包处理框架，netfilter 在内核协议栈的不同位置实现了 5 个 hook 点，其它内核模块(例如 iptables、IPVS 等)可以向这些 hook 点注册处理函数，当数据包经过这些 hook 点时，注册处理函数被依次调用，进而实现对数据包过滤、修改、SNAT/DNAT 等各类处理。
- **conntrack（连接跟踪）** 允许内核跟踪所有逻辑网络连接或会话，从而关联可能构成该连接的所有数据包。conntrack 是 NAT 以及有状态防火墙等实现基础。
- **traffic control（流量控制器）** 用于Linux内核的流量控制，主要是通过在输出端口处建立一个队列来实现流量控制。


## netfilter 的应用示例

我们以 Kubernetes 网络模型说明 netfilter 的作用，如图 2-10 示例，当一个 Pod 跨 Node 进行通信时，数据包从 Pod 网络 Veth 接口发送到 cni0 虚拟网桥，进入主机协议栈之后，首先会经过 PREROUTING hook，调用相关的链做 DNAT，经过 DNAT 处理后，数据包目的地址变成另外一个 Pod 地址，再继续转发至 eth0，发给正确的集群节点。

<div  align="center">
	<img src="../assets/netfilter-k8s.png" width = "550"  align=center />
	<p>图 2-10 kubernetes 网络模型</p>
</div>


