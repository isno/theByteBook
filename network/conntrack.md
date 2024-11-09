# 3.3.3 连接跟踪模块 conntrack

conntrack 是 connection track（连接跟踪）的缩写。

顾名思义，Linux 内核中的 conntrack 模块是用来跟踪“连接”的。需要注意的是，conntrack 中的“连接”指的是通信双方之间的数据传输连接，不仅跟踪 TCP 连接，还可以跟踪 UDP、ICMP 这样的“连接”。

当 Linux 系统收到数据包时，内核中的 conntrack 模块为其新建一个（或标识属于某个）连接记录（或称连接条目），并根据数据包类型更新连接状态（如 NEW、ESTABLISHED 等）。用 TCP 三次握手的例子说明：
- 首先，客户端向服务器发送一个 TCP SYN 包请求建立连接。
- Linux 系统收到 TCP SYN 包时，内核中的 conntrack 模块为其创建一个新的连接记录，并将状态标记成 NEW。
- 随后，服务器回复一个 SYN-ACK，等待客户端的 ACK 报文。一旦 TCP 握手完成，连接记录中的状态变成 ESTABLISHED。

通过命令 cat /proc/net/nf_conntrack 查看连接记录，输出了一个连接类型为 TCP，连接状态为 ESTABLISHED 的连接记录。

```bash
$ cat /proc/net/nf_conntrack
ipv4     2 tcp      6 88 ESTABLISHED src=10.0.12.12 dst=10.0.12.14 sport=48318 dport=27017 src=10.0.12.14 dst=10.0.12.12 sport=27017 dport=48318 [ASSURED] mark=0 zone=0 use=2
```

conntrack 连接记录是 iptables 连接状态匹配的基础，也是实现 SNAT 和 DNAT 的前提。

我们知道 Kubernetes 的核心组件 kube-proxy，作用是负责处理集群中的服务（Service）网络流量。它的本质其实是个反向代理（也就是 NAT）。当外部请求访问 Service 时，请求被 DNAT 成 PodIP:Port，响应时再经过 SNAT。

举一个具体的例子，客户端向 my-service（IP 10.0.0.10 ）发送 HTTP 请求，端口 80。

- 节点中的 kube-proxy 收到请求后，执行 DNAT 操作，将目标地址 10.0.0.10:80 转换为某个 Pod 的 IP 和端口，例如 192.168.1.2:8080。
- Pod 处理请求，并返回响应，kube-proxy 执行 SNAT 操作，将响应的源地址 192.168.1.2:8080 转换为 Service IP 10.0.0.10:80。

conntrack 模块维护的连接记录包含了从客户端到 Pod 的 DNAT 映射（10.0.0.10:80 到 192.168.1.2:8080）以及从 Pod 到客户端的 SNAT 映射（192.168.1.2:8080 到 10.0.0.10:80）。这样有来有回，是一条完整的 NAT 映射关系。

但如果发起请求的客户端和处理请求的 Pod 在同一个主机内（图 3-5），问题来了：
- 发起请求时，数据包经过网络层时，内核中的 conntrack 模块根据 iptables 规则，判断是否需要进行 DNAT；
- 返回响应时，如果 Linux 网桥检测到目的 IP 位于同一网桥上，则直接通过链路层转发，并没有触发网络层的 conntrack 模块，也就是不进行 SNAT。

因此，通信双方不在同一“频道”上，与 NAT 相关的连接记录不完整，进而影响容器间通信，产生各类异常。

:::center
  ![](../assets/bridge-call-iptables.svg)<br/>
  图 3-5 请求和响应不在一个“频道”上，双方通信失败
:::

针对上述问题，Linux 内核开放了 bridge-nf-call-iptables 配置，决定 Linux 网桥中的数据包是否触发 iptables 匹配规则。也就是处理 NAT 保证 conntrack 连接记录的完整性。这也解释了为什么部署 Kubernetes 集群时，务必开启 Linux 系统配置 bridge-nf-call-iptables（设置为 1）的原因。

