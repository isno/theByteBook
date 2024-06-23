# 3.5.2 虚拟网卡 TUN/TAP 和 Veth

## 1. TUN/TAP

目前主流的虚拟网卡有 TUN/TAP 和 Veth 两种，时间上 TUN/TAP 出现的更早，Linux 内核 2.4.x 起就已支持。

TUN/TAP 不是一个设备，而是两个相对独立的虚拟网络设备：
- 其中 TAP 模拟了以太网设备，操作的是数据帧，工作在 L2；
- TUN 则模拟了网络层设备，操作的是 IP 数据包，工作在 L3。

我们可以把 TUN/TAP 理解为一端连着网络协议栈，另一端连着用户态程序，这种能力可以将 TCP/IP 协议栈处理好的网络包发送给任何一个使用 TUN/TAP 驱动的用户进程。**协议栈中的数据包原本被发送到 eth0 设备或者其他借口，现在转发到用户态程序，用户态程序对它加工处理，从而实现数据压缩、流量加密、透明代理等功能**。

如图 3-20 示例，应用程序通过 TUN 发送数据包，TUN 设备发现另一端被 VPN 程序关联，便会通过字符设备发送给 VPN，VPN 收到数据包之后修改内容，然后封装到另一个发送给 B 地址的新报文中。

:::center
  ![](../assets/tun.svg)<br/>
 图 3-20 VPN 中数据流动示意图
:::

:::tip <a/>
这种将一个数据包封装到另一个数据包的处理方式被称为 “隧道”。隧道技术是构建虚拟逻辑网络的经典做法，OpenVPN、Vtun、Flannel UDP 模式 等都是基于 TUN/TAP 实现隧道封装的。
:::

容器网络解决方案 Flannel UDP 模式曾使用 TUN 设备实现容器间 Overlay 网络，**但使用 TUN/TAP 设备传输数据需要经过两次协议栈，会有多次的封包/解包，产生额外的性能损耗**，这也是 Flannel UDP 模式被弃用的原因。

## 2. Veth

Veth 是另一种主流的虚拟网卡方案，在 Linux Kernel 2.6 版本支持网络命名空间的同时，也提供了专门的虚拟 Veth（Virtual Ethernet，虚拟以太网）设备，用来让两个隔离的网络命名空间可以互相通信。

**简单理解 Veth 就是一根带两个 Ethernet 网卡的`网线`，从一头发数据，另一头收数据，如果 veth-1 和 veth-2 是一对 Veth 设备，veth-1 发送的数据会由 veth-2 收到，反之亦然**。

所以严格来说 Veth 也是一对设备，因而也常被称作 veth-pair。

:::center
  ![](../assets/veth.svg)<br/>
 图 3-21 Veth 设备对
:::

因为 Veth 这个特性，它常常充当着一个桥梁，连接着同主机内的虚拟网络，典型的例子像两个隔离的网络命名空间之间的连接、Linux Bridge 和 OVS （Open vSwitch）之间的连接等，通过这种方式，从而构建出复杂的虚拟网络拓扑架构。

:::center
  ![](../assets/cni0.svg)<br/>
图 3-22 Pod 通过 Veth 互联以及桥接到 Linux Bridge
:::

我们在 Kubernetes 主机中查看网卡设备，总能看到一堆 Veth 开头的网卡设备信息，这些就是为不同 Pod 之间通信而创建的虚拟网卡。

```plain
$ ip addr
7: veth9c0be5b3@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue master cni0 state UP group default 
    link/ether e2:7c:c8:36:d7:14 brd ff:ff:ff:ff:ff:ff link-netnsid 2
    inet6 fe80::e07c:c8ff:fe36:d714/64 scope link 
       valid_lft forever preferred_lft forever
```

虽然 Veth 模拟网卡直连的方式解决了两个容器之间的通信问题，然而对多个容器间通信，如果仍然只用 Veth 的话，事情就会变得非常麻烦，让每个容器都为与它通信的其他容器建立一对专用的 Veth Pair，根本不切实际。

此刻，就迫切需要有一台虚拟化的交换机，来解决多容器之间的通信问题，这就是我们前面多次提到的 Linux Bridge。
