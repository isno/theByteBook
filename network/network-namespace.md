# 3.5.1 网络命名空间

从 Linux 内核 2.4.19 版本开始，逐步集成了多种命名空间技术，以实现对各类资源的隔离。其中，网络命名空间（Network Namespace）是最为关键的一种，也是容器技术的核心。

网络命名空间允许 Linux 系统内创建多个独立的网络环境，每个环境拥有独立的网络资源，如防火墙规则、网络接口、路由表、ARP 邻居表及完整的网络协议栈。当进程运行在某个网络命名空间内时，就像独享一台物理主机。

:::center
  ![](../assets/linux-namespace.svg)<br/>
 图 3-12 不同网络命名空间内的网络资源都是隔离的
:::

在 Linux 系统 中，ip 工具的子命令 netns 集成了网络命名空间的增、删、查、改等功能。接下来，笔者将使用 ip 命令演示如何操作网络命名空间，帮助你加深理解。

首先，创建一个名为 ns1 的网络命名空间。命令如下所示：

```bash
$ ip netns add ns1
```

查询 ns1 网络命名空间内的网络设备信息。可以看到，由于没有进行任何配置，该网络命名空间内只有一个名为 lo 的本地回环设备，且设备状态为 DOWN。

```bash
$ ip netns exec ns1 ip link list 
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

查看 ns1 网络命名空间下的 iptables 规则配置。可以看到，由于这是一个初始化的网络命名空间，因此 iptables 规则为空，并没有任何配置。

```bash
$ ip netns exec ns1 iptables -L -n
Chain INPUT (policy ACCEPT)
target     prot opt source               destination         

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination         

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination 
```

不难看出，不同的网络命名空间默认相互隔离，也无法直接通信。如果它们需要与外界（包括其他网络命名空间或宿主机）建立连接，该如何实现呢？

我们先看看物理机是怎么操作的，一台物理机如果要想与外界进行通信，那得插入一块网卡，通过网线连接到以太网交换机，加入一个局域网内。被隔离的网络命名空间如果想与外界进行通信，就需要利用到稍后介绍的各类虚拟网络设备。也就是，在网络命名空间里面插入“虚拟网卡”，然后把“网线”的另一头桥接到“虚拟交换机”中。

没错，这些操作完全和物理环境中的配置局域网一样，只不过全部是虚拟的、用代码实现的而已。