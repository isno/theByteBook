# Network namespace

顾名思义，namespace 的作用是 Linux 内核用来隔离内核资源。而 network namespace 的作用就是用来隔离网络资源。

network namespace 是 Linux 内核提供的用于实现网络虚拟化的重要功能，它能创建多个隔离的网络空间，该网络空间内的防火墙、网卡、路由表、邻居表、协议栈与外部都是独立的，不管是虚拟机还是容器，当运行在独立的命名空间时，就像是一台单独的主机一样。


<div  align="center">
	<img src="../assets/net-namespace.png" width = "450"  align=center />
</div>

由于每个容器都有自己的网络服务, 一个比较直观的例子是：在 network namespace 的作用下，这就使得一个主机内运行两个同时监听80端口的 Nginx 服务能为可能。

### network namespace 实践

笔者在这里通过实践操作，创建不同的netns （network namespace），以及实现 netns 之间的通信，以便读者贯彻理解 network namespace。

Linux ip 工具的子命令 netns 集成了 network namespace 的增删查改功能，我们使用 ip 命令进行操作。

创建新的netns：

```
ip netns add ns1
```

当 ip 命令创建一个 network namespace 时，系统会在 /var/run/netns 生成一个挂载点。挂载点的作用是方便对 namespace 进行管理，另一方面也使得 namespace 即使没有进程运行也能继续存在。

查询该 netns 的基本信息

```
$ ip netns exec ns1 ip link list
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

由于没有任何配置，因此该 netns 下，只有一块状态为DOWN的本地回环设备lo。

### 配置 network namespace

由于不同的网络命名空间之间是相互隔离的，所以不同的网络命名空间之间并不能直接通信。

如果想与外界（其他netns、或者主机网卡）进行通信，就需要在 netns 里面再创建一对虚拟的以太网卡，也就是 veth pair。（关于veth pair的介绍，参加下一节，本篇不再赘述）。

下面的命令创建一对虚拟以太网卡，然后把 veth pair 的一端放入 ns1 中, 另外一端放入 ns2 中。

```
$ ip netns add ns1
$ ip netns add ns2

$ ip link add veth1 type veth peer name veth1-peer

$ ip link set veth1 netns ns1
$ ip link set veth1-peer netns ns2
```
由于网卡创建的初始状态为 Down，下面的命令把网卡启用并配置ip地址。

```
$ ip netns exec ns1 ip addr add 172.16.0.1/24 dev veth1
$ ip netns exec ns1 ip link set dev veth1 up

$ ip netns exec ns2 ip addr add 172.16.0.2/24 dev veth1-peer
$ ip netns exec ns2 ip link set dev veth1-peer up
```

然后我们可以看到 这两个 network namespace 里面设置好了各自的虚拟网卡以及对应的 ip：

```
$ ip netns exec ns1 ip addr
13: veth1@if12: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 92:02:64:b0:9f:0e brd ff:ff:ff:ff:ff:ff link-netnsid 1
    inet 172.16.0.1/24 scope global veth1
    ...
```

现在我们测试这两个 ns 是否可以相互通信：

```
$ ip netns exec ns1 ping 172.16.0.2
PING 172.16.0.2 (172.16.0.2) 56(84) bytes of data.
64 bytes from 172.16.0.2: icmp_seq=1 ttl=64 time=0.309 ms
64 bytes from 172.16.0.2: icmp_seq=2 ttl=64 time=0.079 ms
...
```

## 小结

分析上面的流程：

- ns1 中的 ping 进程构造 ICMP 包，通过 socket 发给协议栈
- 协议栈根据目的IP地址和系统路由表，知道去 172.16.0.2 数据包应该要由 172.16.0.1 口出去
- 协议栈将 ARP 包交给 veth1，让它发出去
- 由于 veth1 的另一端连的是 veth1-peer，所以 ARP 请求包就转发给了 veth1-peer
- veth1-peer 收到 ARP 包后，转交给另一端的协议栈，做出 ARP 应答

如上所见，无论是从 ns 中向宿主机发起通信，还是从宿主机向 ns 中的设备发起通信，都是可行的，到目前为止基于 Veth-Pair 实现了 netns 之间点对点通信。
