# 3.3.3 连接跟踪模块 conntrack

conntrack 是“连接跟踪”（connection tracking）的缩写，顾名思义，它用于跟踪 Linux 内核中的通信连接。需要注意的是，conntrack 跟踪的“连接”不仅限于 TCP 连接，还包括 UDP、ICMP 等类型的连接。当 Linux 系统收到数据包时，conntrack 模块会为其创建一个新的连接记录，并根据数据包的类型更新连接状态，如 NEW、ESTABLISHED 等。

以 TCP 三次握手为例，说明 conntrack 模块的工作原理 ：

1. 客户端向服务器发送一个 TCP SYN 包，发起连接请求。
2. Linux 系统收到 SYN 包后，conntrack 模块为其创建新的连接记录，并将状态标记为 NEW。
3. 服务器回复 SYN-ACK 包，等待客户端的 ACK。一旦握手完成，连接状态变为 ESTABLISHED。

通过命令 cat /proc/net/nf_conntrack 查看连接记录，如下所示，输出了一个状态为 ESTABLISHED 的 TCP 连接。
```bash
$ cat /proc/net/nf_conntrack
ipv4     2 tcp      6 88 ESTABLISHED src=10.0.12.12 dst=10.0.12.14 sport=48318 dport=27017 src=10.0.12.14 dst=10.0.12.12 sport=27017 dport=48318 [ASSURED] mark=0 zone=0 use=2
```

conntrack 连接记录是 iptables 连接状态匹配的基础，也是实现 SNAT 和 DNAT 的前提。我们知道 Kubernetes 的核心组件 kube-proxy，它作用是负责处理集群中的服务（Service）网络流量。它本质上是一个反向代理（即 NAT），当外部请求访问 Service 时，流量会被 DNAT 转发到 PodIP:Port，响应则经过 SNAT 处理。

举一个具体的例子说明。假设客户端向 my-service（IP 10.0.0.10，端口 80）发送 HTTP 请求，流程如下：
- 节点中的 kube-proxy 收到请求后，执行 DNAT 操作，将目标地址从 10.0.0.10:80 转换为某个 Pod 的 IP 和端口（如 192.168.1.2:8080）。
- Pod 处理请求并返回响应，kube-proxy 执行 SNAT 操作，将响应包的源地址从 192.168.1.2:8080 转换为 Service IP 10.0.0.10:80。

conntrack 模块维护的连接记录包含了从客户端到 Pod 的 DNAT 映射、从 Pod 到客户端的 SNAT 映射。这样有来有回，是一条完整的 NAT 映射关系。但是，如果客户端与 Pod 在同一主机上（如图 3-5），则会出现以下问题：
- 客户端发起请求时，数据包经过网络层，conntrack 模块根据 iptables 规则判断是否需要进行 DNAT；
- 返回响应时，Linux 网桥发现目标 IP 位于同一网桥上，会直接通过链路层转发数据包，而不会触发网络层的 conntrack 模块，导致 SNAT 操作没有执行。

如图 3-5 所示，通信双方不在同一“频道”上，NAT 映射关系不完整，进而影响容器间通信，产生各种异常。

:::center
  ![](../assets/bridge-call-iptables.svg)<br/>
  图 3-5 请求和响应不在一个“频道”上，双方通信失败
:::

为了解决上述问题，Linux 内核引入了 bridge-nf-call-iptables 配置，决定是否在网桥中触发 iptables 匹配规则，从而保证 NAT 处理时 conntrack 连接记录的完整性。这也解释了为什么在部署 Kubernetes 集群时，必须将该配置设置为 1。

