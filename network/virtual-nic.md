# 3.5.2 虚拟网卡 tun/tap 和 veth

## tun/tap

目前主流的虚拟网卡有 tun/tap 和 veth 两种，时间上 tun/tap 出现的更早，Linux 内核 2.4.x 起就已支持。tun/tap 不是一个设备，而是两个相对独立的虚拟网络设备：
- 其中 tap 模拟了以太网设备，操作的是数据帧，工作在 L2；
- tun 则模拟了网络层设备，操作的是 IP 报文。

我们可以把 tun/tap 理解为一端连着网络协议栈，另一端连着用户态程序，这种能力可以将 TCP/IP 协议栈处理好的网络包发送给任何一个使用 tun/tap 驱动的进程，只要协议栈中的数据包能被用户态程序截获并加工处理，就能实现譬如数据压缩、流量加密、透明代理等功能。

<div  align="center">
	<img src="../assets/tun.svg" width = "400"  align=center />
	<p>图 3-20 VPN 中数据流动示意图</p>
</div>

tun/tap 设备通常用作 overlay 网络传输，如图示例，应用程序通过 tun 发送数据包，tun 设备如果发现另一读被 VPN 程序打开，便会通过字符设备发送给 VPN，VPN 收到数据包，重新修改成新报文，然后作为报文体，再封装到另一个发送给 B 地址的新报文中，这种将一个数据包封装到另一个数据包的处理方式被称为 「隧道」，隧道技术是构建虚拟逻辑网络的经典做法。OpenVPN、Vtun、Flannel 等都是基于 tun/tap 实现隧道封装的，后续章节讲到的 VXLAN 网卡也是一种 tun 设备。

使用 tun/tap 设备传输数据需要经过两次协议栈，会有多次的封包解包，一定的性能损耗，这也是大家所说 Flannel UDP 模式性能较低的原因。

## veth

veth 是另一种主流的虚拟网卡方案，在 Linux Kernel 2.6 版本支持网络命名空间的同时，也提供了专门的虚拟 Veth（Virtual Ethernet，虚拟以太网）设备，用来让两个隔离的网络命名空间可以互相通信。

简单理解 veth 就是一根带两个 Ethernet 网卡的`网线`，从一头发数据，另一头收数据，如果 veth-1 和 veth-2 是一对 veth 设备，veth-1 发送的数据会由 veth-2 收到，反之亦然。所以严格来说，veth 也是一对设备，因而也常被称作 veth pair。

<div  align="center">
	<img src="../assets/veth.svg" width = "450"  align=center />
	<p>图 3-21 veth 设备对</p>
</div>

因为 veth 这个特性，它常常充当着一个桥梁，连接着宿主机内的虚拟网络，典型的例子像两个隔离的网络命名空间之间的连接、Bridge（Linux 网桥） 和 OVS （Open vSwitch）之间的连接等，通过这种方式，从而构建出复杂的虚拟网络拓扑架构。

<div  align="center">
	<img src="../assets/cni0.svg" width = "550"  align=center />
	<p>图 3-22 Pod 通过 veth 互联以及链接到 Linux 网桥</p>
</div>

我们在 Kubernetes 宿主机中查看网卡设备，总能看到一堆 veth 开头的网卡设备信息，这些就是为不同 Pod 之间通信而创建的虚拟网卡。

```plain
$ ip addr
7: veth9c0be5b3@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue master cni0 state UP group default 
    link/ether e2:7c:c8:36:d7:14 brd ff:ff:ff:ff:ff:ff link-netnsid 2
    inet6 fe80::e07c:c8ff:fe36:d714/64 scope link 
       valid_lft forever preferred_lft forever
```

虽然 veth 以模拟网卡直连的方式，很好地解决了两个容器之间的通信问题，然而对多个容器间通信，如果仍然单纯只用 veth pair 的话，事情就会变得非常麻烦，毕竟，让每个容器都为与它通信的其他容器建立一对专用的 veth pair，根本就不实际，真正做起来成本会很高。

因此这时，就迫切需要有一台虚拟化的交换机，来解决多容器之间的通信问题了
