# 3.2 Linux 内核网络框架

笔者在1.5.3节提到过 Cilium 利用 eBPF 实现的无边车服务网格（sidecarless service mesh）模式，其次在 Kubernetes 节点中查看 iptables 规则，总能看到一堆奇怪的 “KUBE-SVC-XXX”，不熟悉的同学估计会一头雾水。不过我相信，看完3.2节内容读者一定感叹“原来如此”。

如图3-3所示，该架构图来自 Netfilter 项目[^1]，图片名称为 《Packet flow in NetFilter and General Networking》，该设计图较全面介绍了内核网络设计原理，包含了 XDP、NetFilter 和 traffic control 部分。带颜色的部分为 NetFilter 模块，有着更细节的内核协议栈各 hook 点位置和 iptables 规则优先级的经典配图。


<div  align="center">
	<img src="../assets/Netfilter-packet-flow.svg" width = "800"  align=center />
	<p>图3-3 网络数据包流程和 Netfilter 框架</p>
</div>

如图3-3所示，Netfilter 实际上就是一个过滤器框架，Netfilter 在网络包收发以及路由的“管道”中，一共切了5个口（hook），分别是 PREROUTING、FORWARD、POSTROUTING、INPUT 以及 OUTPUT，其它内核模块(例如 iptables、IPVS 等)可以向这些 hook 点注册处理函数，当数据包经过这些 hook 点时，注册处理函数被依次调用，从而实现对数据包过滤、修改、SNAT/DNAT 等各类功能。


如图3-4所示，Kubernetes 集群服务的本质其实就是负载均衡或反向代理，而实现反向代理，归根结底就是做 DNAT，即把发送给集群服务的 IP 地址和端口的数据包，修改成具体容器组的 IP 地址和端口。

<div  align="center">
	<img src="../assets/k8s-service.svg" width = "450"  align=center />
	<p>图3-4 Kubernetes 服务本的质</p>
</div>

以 Kubernetes 网络模型说明 netfilter 的作用，如图 2-10 示例，当一个 Pod 跨 Node 进行通信时，数据包从 Pod 网络 Veth 接口发送到 cni0 虚拟网桥，进入主机协议栈之后，首先会经过 PREROUTING hook，调用相关的链做 DNAT，经过 DNAT 处理后，数据包目的地址变成另外一个 Pod 地址，再继续转发至 eth0，发给正确的集群节点。

<div  align="center">
	<img src="../assets/netfilter-k8s.png" width = "550"  align=center />
	<p>图 2-10 kubernetes 网络模型</p>
</div>


对Linux内核网络有了基本的了解之后，我们先看数据经过的第一个模块，XDP。

[^1]: 参见 https://en.wikipedia.org/wiki/Netfilter