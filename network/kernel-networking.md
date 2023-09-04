# 2.4.1 内核处理包处理流程

在本节，我们根据图 2-9，以一个数据包在 Linux 内核的流向处理为例说明 XDP、netfilter、conntrack 的作用。首先对 图 2-9 各个模块进行说明。

图中用有颜色的长方形方框表示 iptables 或 ebtables 的表和链，绿色小方框表示 network level，即 iptables 的表和链（用以处理 IP 数据包）。蓝色小方框表示 bridge level，即 ebtables 的表和链（用以处理太网帧），由于处理以太网帧相对简单，因此链路层的蓝色小方框相对较少。

我们还注意到一些代表 iptables 表和链的绿色小方框位于链路层，这是为了解决在链路层 Bridge 中处理 IP 数据包而引入 bridge_nf 的原因，这也是安装 Kubernetes 要求开启 bridge-nf-call-iptables 的原因。

椭圆形的方框为 conntrack ，即 connection tracking，这是 netfilter 提供的连接跟踪机制，此机制允许内核“审查”通过此处的所有网络数据包，并能识别出此数据包属于哪个网络连接，conntrack 机制是 iptables 实现状态匹配(-m state)以及 NAT 的基础，它由单独的内核模块 nf_conntrack 实现。

图中左下方 bridge check 用于检测数据包从主机上的某个网络接口进入时，检查此网络接口是否属于某个 Bridge 的 port，如果是就会进入 Bridge 代码处理逻辑(下方蓝色区域bridge level), 否则就会送入网络层 Network Layer 处理。

图中下方中间位置的 bridging decision 类似普通二层交换机的查表转发功能，根据数据包目的 MAC 地址判断此数据包是转发还是交给上层处理。
图中中心位置的 routing decision 就是路由选择，根据系统路由表(ip route查看), 决定数据包是 forward 还是交给本地处理。

总的来看，不同 packet 有不同的 packet flow，packet 总是从主机的某个接口进入(左下方ingress), 然后经过 check、decision以及一系列表和链处理，最后，目的地或是主机上某应用进程或是需要从主机另一个接口发出(右下方 egress)。这里的接口即可以是物理网卡，也可以是虚拟网卡tun0 还可以是 Bridge上的一个port。



## netfilter 的应用示例

我们以 Kubernetes 网络模型说明 netfilter 的作用，如图 2-10 示例，当一个 Pod 跨 Node 进行通信时，数据包从 Pod 网络 Veth 接口发送到 cni0 虚拟网桥，进入主机协议栈之后，首先会经过 PREROUTING hook，调用相关的链做 DNAT，经过 DNAT 处理后，数据包目的地址变成另外一个 Pod 地址，再继续转发至 eth0，发给正确的集群节点。

<div  align="center">
	<img src="../assets/netfilter-k8s.png" width = "550"  align=center />
	<p>图 2-10 kubernetes 网络模型</p>
</div>
