# 3.5.2 虚拟网卡 Veth-pair

Linux 内核 2.6 版本支持网络命名空间的同时，也提供了专门的虚拟网卡 Veth（Virtual Ethernet，虚拟以太网网卡），用来支持隔离的网络命名空间与外界进行通信。

我们可以把 Veth 理解成带着两个“水晶头”的一根“网线”，从网线的一头发送数据，另一头就会收到数据。因此 Veth 也被说成是一对设备（称作 Veth-pair）。

Veth 典型的使用例子是，实现隔离的网络命名空间之间的互联，以及 Linux Bridge 和 Open vSwitch（OVS）等虚拟交换机的连接。我们在 Kubernetes 集群中查看网卡设备，总能看到一堆 Veth 开头的设备信息，这些就是为不同 Pod 之间通信而创建的虚拟网卡。

```plain
$ ip addr
7: veth9c0be5b3@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue master cni0 state UP group default 
    link/ether e2:7c:c8:36:d7:14 brd ff:ff:ff:ff:ff:ff link-netnsid 2
    inet6 fe80::e07c:c8ff:fe36:d714/64 scope link 
       valid_lft forever preferred_lft forever
```

假设我们已经有两个相互隔离的网络命名空间 net1 和 net2，下面笔者进行操作演示，看看如何通过 veth 实现这网络命名空间的互通。

1. 创建一对名为 veth1 和 veth2 的 veth 接口。

```bash
$ ip link add veth1 type veth peer name veth2
```

2、 接下来，要做的是把这对 veth pair 分别放到 net1 和 net2 中，这个可以使用 ip link set DEV netns NAME 来实现。

```bash
$ ip link set veth1 netns net1
$ ip link set veth2 netns net2
```
3. 接下来，我们再给这对 veth pair 配置上 ip 地址，并启用它们。

```bash
$ ip netns exec net1 ip link set veth1 up
$ ip netns exec net1 ip addr add 172.16.0.1/24 dev veth1
$ ip netns exec net1 ip route
172.16.0.0/24 dev veth1  proto kernel  scope link  src 172.16.0.1

$ ip netns exec net2 ip link set veth2 up
$ ip netns exec net2 ip addr add 172.16.0.2/24 dev veth2
```

可以看到，每个网络命名空间中，在配置完 ip 之后，还自动生成了对应的路由表信息：网络 172.16.0.0/24 数据报文都会通过 veth pair 进行传输。

完成以上的操作，我们创建的网络拓扑结构如下所示。

:::center
  ![](../assets/veth.svg)<br/>
 图 3-21 Veth 设备对
:::

4. 最后，我们 ns1 中进行 ping 测试，可以看到两个命名空间是联通的了。

```bash
$ ip netns exec ns1 ping -c10 172.16.0.2
PING 172.16.0.2 (172.16.0.2) 56(84) bytes of data.
64 bytes from 172.16.0.2: icmp_seq=1 ttl=64 time=0.121 ms
64 bytes from 172.16.0.2: icmp_seq=2 ttl=64 time=0.063 ms
```

虽然 Veth 模拟网卡直连的方式解决了两个容器之间的通信问题，然而对多个容器间通信，如果只用 Veth 的话，事情就会变得非常麻烦，让每个容器都为与它通信的其他容器建立一对专用的 Veth Pair，根本不切实际。

此刻，就迫切需要有一台虚拟化的交换机，来解决多容器之间的通信问题，这就是我们前面多次提到的 Linux Bridge。

