# 2.4 netfilter 与 kubernetes 网络

<div  align="center">
	<img src="../assets/netfilter-k8s.png" width = "600"  align=center />
	<p>图: kubernetes 网络</p>
</div>

数据包从 Pod 网络 Vthe 接口发送到 cni0 虚拟网桥，进入主机协议栈之后，首先会经过 PREROUTING，调用相关的链做 DNAT，经过 DNAT 处理后，数据包的目的地址变成另外一个 Pod 地址，再继续转发至 eth0，发给正确的集群节点。