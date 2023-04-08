# 网络虚拟化的基础：network namespace

顾名思义，namespace 的作用是 Linux 内核用来隔离内核资源。而 network namespace就是用来隔离网络资源的。

Linux通过对内核资源进行封装抽象，提供了六类系统资源的隔离机制：mount namespace(文件系统挂载点)、uts namespace(主机名和域名信息)、ipc namespace(进程间通信)、pid namespace(进程的ID)、network namespace(网络资源)、user namespace(用户和用户组的ID)。

Linux 内核实现 namespace 的一个主要目的就是实现轻量级虚拟化(容器)服务。

在同一个 namespace 下的进程可以感知彼此的变化，而对外界的进程一无所知。这样就可以让容器中的进程置身于一个独立的系统中，从而达到隔离的目的。毫不夸张地说 namespace ，是整个Linux网络虚拟化，甚至更进一步也可以说是前云计算潮流的基石。


## network namespace 

network namespace 是 Linux 内核提供的用于实现网络虚拟化的重要功能，它能创建多个隔离的网络空间，该网络空间内的防火墙、网卡、路由表、邻居表、协议栈与外部都是独立的。不管是虚拟机还是容器，当运行在独立的命名空间时，就像是一台单独的主机一样。


<div  align="center">
	<img src="../assets/net-namespace.png" width = "450"  align=center />
</div>

由于每个容器都有自己的网络服务, 一个比较直观的例子是：在network namespace的作用下，这就使得一个主机内运行两个同时监听80端口的Nginx服务能为可能。

## network namespace 实践

Linux ip工具的子命令netns集成了network namespace的增删查改功能，笔者在这里通过实践操作，以便读者贯彻理解 network namespace。

创建新的netns：

```
ip netns add netns1
```

当ip命令创建一个 network namespace时，系统会在 /var/run/netns 生成一个挂载点。挂载点的作用是方便对namespace 进行管理，除此也使没有进程运行，namespace 也能继续运行。


查询该 netns的 基本信息。
```
$ ip netns exec netns1 ip link list
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

由于没有任何配置，因此该 netns 下，只有一块状态为DOWN的本地回环设备lo。

### 配置 network namespace

由于不同的网络命名空间之间是相互隔离的，所以不同的网络命名空间之间并不能直接通信。如果想想与外界（其他netns、或者主机网卡）进行通信，就需要在namespace里面再创建一对虚拟的以太网卡，也就是 veth pair。（关于veth pair的介绍，参加下一节，本篇不再赘述）。

下面的命令创建一对虚拟以太网卡，然后把 veth pair的一端放入 netns1 中, 另外一端放入 netns2中。

```
$ ip netns add netns1
$ ip netns add netns2

$ ip link add veth1 type veth peer name veth1-peer

$ ip link set veth1 netns netns1
$ ip link set veth1-peer netns netns2
```
由于网卡创建的初始状态为Down，下面的命令把网卡启用并配置ip地址。

```
$ ip netns exec netns1 ip addr add 172.16.0.1/24 dev veth1
$ ip netns exec netns1 ip link set dev veth1 up

$ ip netns exec netns2 ip addr add 172.16.0.2/24 dev veth1-peer
$ ip netns exec netns2 ip link set dev veth1-peer up
```

然后我们可以看到 这两个 network namespace 里面设置好了各自的虚拟网卡以及对应的ip：

```
$ ip netns exec netns1 ip addr
13: veth1@if12: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 92:02:64:b0:9f:0e brd ff:ff:ff:ff:ff:ff link-netnsid 1
    inet 172.16.0.1/24 scope global veth1
    ...
```

现在我们可以尝试这对 这两个 ns 是否可以相互通信：

```
$ ip netns exec netns1 ping 172.16.0.2
PING 172.16.0.2 (172.16.0.2) 56(84) bytes of data.
64 bytes from 172.16.0.2: icmp_seq=1 ttl=64 time=0.309 ms
64 bytes from 172.16.0.2: icmp_seq=2 ttl=64 time=0.079 ms
...
```

分析上面的流程：

- netns1 中的ping进程构造ICMP包，通过socket发给协议栈
- 协议栈根据目的IP地址和系统路由表，知道去 172.16.0.2 的数据包应该要由 172.16.0.1 口出去
- 协议栈将 ARP 包交给 veth1，让它发出去
- 由于 veth1 的另一端连的是 veth1-peer，所以ARP请求包就转发给了 veth1-peer
- veth1-peer 收到 ARP 包后，转交给另一端的协议栈，做出 ARP 应答

如上所见，无论是从 netns 中向宿主机发起通信，还是从宿主机向 netns 中的设备发起通信，都是可以行，到目前为止我们已经实现了点对点的通信。
