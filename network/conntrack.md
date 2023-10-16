# 3.2.2 连接跟踪 conntrack

连接跟踪（connection tracking，conntrack，CT）对连接状态进行跟踪并记录。如图3-11所示，这是一台 IP 地址为 10.1.1.3 的 Linux 机器，我们能看到这台机器上有两条连接：

- 机器访问外部 HTTP 服务的连接（目的端口 80）。
- 机器访问外部 DNS 服务的连接（目的端口 53）。

<div  align="center">
	<img src="../assets/conntrack.png" width = "400"  align=center />
	<p>图3-11 conntrack 示例</p>
</div>

连接跟踪所做的事情就是发现并跟踪这些连接的状态，具体包括：

- 从数据包中提取元组信息，辨别数据流和对应的连接。
- 为所有连接维护一个状态数据库（conntrack table），例如连接的创建时间、发送 包数、发送字节数等。
- 回收过期的连接（GC）。
- 为更上层的功能（例如 NAT）提供服务。

## 1. conntrack 原理

当加载内核模块 nf_conntrack 后，conntrack 机制就开始工作，根据图3-3《Packet flow in NetFilter and General Networking》所示，conntrack（椭圆形方框）在内核中有两处位置（PREROUTING 和 OUTPUT之前）能够跟踪数据包。

每个通过 conntrack 的数据包，内核都为其生成一个 conntrack 条目用以跟踪此连接，对于后续通过的数据包，内核会判断若此数据包属于一个已有的连接，则更新所对应的 conntrack 条目的状态(比如更新为 ESTABLISHED 状态)，否则内核会为它新建一个 conntrack 条目。所有的 conntrack 条目都存放在一张表里，称为连接跟踪表（conntrack table）。

连接跟踪表存放于系统内存中，可用 cat /proc/net/nf_conntrack 命令查看当前跟踪的所有 conntrack 条目，conntrack 维护的所有信息都包含在这个条目中，通过它就可以知道某个连接处于什么状态。

如下则为表示一条状态为 ESTABLISHED 的 TCP 连接。
```plain
$ cat /proc/net/nf_conntrack
ipv4     2 tcp      6 88 ESTABLISHED src=10.0.12.12 dst=10.0.12.14 sport=48318 dport=27017 src=10.0.12.14 dst=10.0.12.12 sport=27017 dport=48318 [ASSURED] mark=0 zone=0 use=2
```

## 2. conntrack 应用示例 

连接跟踪是许多网络应用的基础，常用的使用场景如 NAT（Network Address Translation，网络地址转换）、iptables 的状态匹配等。

如图3-12所示，机器自己的 IP 10.1.1.3 可以与外部正常通信，但 192.168 网段是私有 IP 段，外界无法访问，源 IP 地址是 192.168 的包，其应答包也无法回来，因此：

- 当源地址为 192.168 网段的包要出去时，机器会先将源 IP 换成机器自己的 10.1.1.3 再发送出去，进行 SNAT（对源地址 source 进行 NAT）。
- 收到应答包时，再进行相反的转换，进行 DNAT（对目的地址 destination 进行 NAT）。

<div  align="center">
	<img src="../assets/nat.png" width = "400"  align=center />
	<p>图 3-12</p>
</div>

当 NAT 网关收到内部网络的请求包之后，会做 SNAT，同时将本次连接记录保存到连接跟踪表，当收到响应包之后，就可以根据连接跟踪表确定目的主机，然后做 DNAT，DNAT + SNAT 其实就是 Full NAT，如图3-13所示。

<div  align="center">
	<img src="../assets/conntrack-nat.png" width = "450"  align=center />
	<p>图 3-13 FullNAT</p>
</div>


搭建 kubernetes 时有一条配置 `net.bridge.bridge-nf-call-iptables = 1`，很多同学不明其意，这里笔者结合 conntrack 说明这个配置的作用。

笔者前面讲过 “Kubernetes 的 Service 本质是个反向代理”，访问 Service 时会进行 DNAT，将原本访问 ClusterIP:Port 的数据包 DNAT 成 Service 的某个 Endpoint (PodIP:Port)，然后内核将连接信息插入 conntrack 表以记录连接，目的端回包的时候内核从 conntrack 表匹配连接并反向 NAT，这样原路返回形成一个完整的连接链路。

但是 Linux 网桥是一个虚拟的二层转发设备，而 iptables conntrack 是在三层上，所以如果直接访问同一网桥内的地址，就会直接走二层转发，不经过 conntrack，由于没有原路返回，客户端与服务端的通信就不在一个 "频道" 上，不认为处在同一个连接，也就无法正常通信。

启用 bridge-nf-call-iptables 这个内核参数 (置为 1)，表示 bridge 设备在二层转发时也去调用 iptables 配置的三层规则 (包含 conntrack)，所以开启这个参数就能够解决上述 Service 同节点通信问题，这也是为什么在 Kubernetes 环境中，大多都要求开启 bridge-nf-call-iptables 的原因。

