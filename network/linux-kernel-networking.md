# 3.2 Linux 内核网络框架

笔者在1.5.3节提到过 Cilium 利用 eBPF 实现的无边车服务网格（sidecarless service mesh）模式，其次在 Kubernetes 节点中查看 iptables 规则，总能看到一堆奇怪的 “KUBE-SVC-XXX”，不熟悉的同学估计会一头雾水。不过我相信，看完3.2节内容读者一定感叹“原来如此”。

如图3-3所示，该架构图来自 Netfilter 项目[^1]，图片名称为 《Packet flow in NetFilter and General Networking》，该设计图较全面介绍了内核网络设计原理，包含了 XDP、NetFilter 和 traffic control 部分。带颜色的部分为 NetFilter 模块，有着更细节的内核协议栈各 hook 点位置和 iptables 规则优先级的经典配图。


<div  align="center">
	<img src="../assets/Netfilter-packet-flow.svg" width = "800"  align=center />
	<p>图3-3 网络数据包流程和 Netfilter 框架</p>
</div>

如图3-3所示，Netfilter 框架贯穿了 Linux 系统的内核态和用户态，我们使用的各类 xtables（iptables、arptables、ebtables） 工具底层都是调用 Netfilter hook API 接口进行实现。


例如，搭建 kubernetes 环境有一条配置 `net.bridge.bridge-nf-call-iptables = 1`，很多同学不明其意，如果结合图3-2解释

不管是 iptables 还是 ipvs 转发模式，Kubernetes 中访问 Service 都会进行 DNAT，将原本访问 ClusterIP:Port 的数据包 DNAT 成 Service 的某个 Endpoint (PodIP:Port)，然后内核将连接信息插入 conntrack 表以记录连接，目的端回包的时候内核从 conntrack 表匹配连接并反向 NAT，这样原路返回形成一个完整的连接链路

但是 Linux 网桥是一个虚拟的二层转发设备，而 iptables conntrack 是在三层上，所以如果直接访问同一网桥内的地址，就会直接走二层转发，不经过 conntrack，由于没有原路返回，客户端与服务端的通信就不在一个 "频道" 上，不认为处在同一个连接，也就无法正常通信。

启用 bridge-nf-call-iptables 这个内核参数 (置为 1)，表示 bridge 设备在二层转发时也去调用 iptables 配置的三层规则 (包含 conntrack)，所以开启这个参数就能够解决上述 Service 同节点通信问题，这也是为什么在 Kubernetes 环境中，大多都要求开启 bridge-nf-call-iptables 的原因。


我们以 Kubernetes 网络模型说明 netfilter 的作用，如图 2-10 示例，当一个 Pod 跨 Node 进行通信时，数据包从 Pod 网络 Veth 接口发送到 cni0 虚拟网桥，进入主机协议栈之后，首先会经过 PREROUTING hook，调用相关的链做 DNAT，经过 DNAT 处理后，数据包目的地址变成另外一个 Pod 地址，再继续转发至 eth0，发给正确的集群节点。

<div  align="center">
	<img src="../assets/netfilter-k8s.png" width = "550"  align=center />
	<p>图 2-10 kubernetes 网络模型</p>
</div>


对Linux内核网络有了基本的了解之后，我们先看数据经过的第一个模块，XDP。

[^1]: 参见 https://en.wikipedia.org/wiki/Netfilter