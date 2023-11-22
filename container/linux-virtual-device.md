# Linux 虚拟设备

Linux 内核支持网络命名空间的同时，也提供了专门的虚拟以太网 Veth（Virtual Ethernet），用来让两个隔离的 Network Namespace 可以互相通信。veth 总是成对出现，因此也常被称作 veth pair（虚拟网卡对）。简单理解 Veth 就是一根带两个 Ethernet 网卡的`网线`，从一头发数据，另一头收数据，如果 veth-1 和 veth-2 是一对 veth 设备，veth-1 发送的数据会由 veth-2 收到，反之亦然。

<div  align="center">
	<img src="../assets/veth.svg" width = "450"  align=center />
	<p>图 2-22</p>
</div>

因为 veth 这个特性，它常常充当着一个桥梁，连接着宿主机内的虚拟网络，典型的例子像两个 Network namespace 之间的连接、Bridge 和 OVS （Open vSwitch）之间的连接等，通过这种方式，从而构建出复杂的虚拟网络拓扑架构。我们在 Kubernetes 集群中的宿主机总能看到一堆 veth 开头的网卡设备信息，这些就是为不同 Pod 之间通信而创建的虚拟网卡。

<div  align="center">
	<img src="../assets/cni0.svg" width = "550"  align=center />
	<p>图 2-23</p>
</div>

在 Kubernetes 宿主机中查看网卡设备。
```plain
$ ip addr
7: veth9c0be5b3@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue master cni0 state UP group default 
    link/ether e2:7c:c8:36:d7:14 brd ff:ff:ff:ff:ff:ff link-netnsid 2
    inet6 fe80::e07c:c8ff:fe36:d714/64 scope link 
       valid_lft forever preferred_lft forever
```
## Linux Bridge

我们使用 veth 实现了两个 Network namespace 之间的点对点通信，但如果是多个 Network Namespace 呢？在物理网络中，如果需要连接多个主机，我们会使用网桥（也可以理解为交换机）设备组成一个小型局域网。在 Linux 网络虚拟化系统中，也提供了网桥虚拟实现 Linux Bridge。

Linux Bridge 是 Linux kernel 2.2 版本开始提供的二层转发工具，与物理交换机机制一致，能够接入任何二层的网络设备（无论是真实的物理设备，例如 eth0 或者虚拟设备，例如 veth、tap 等）。不过 Linux Bridge 与普通物理交换机还有有一点不同，普通的交换机只会单纯地做二层转发，Linux Bridge 却还能把发给它的数据包再发送到主机的三层协议栈中。

我们在部署 Docker 或者 Kubernetes 时，宿主机内的 cni0、docker0 就是它们创建的虚拟 bridge 设备。

<div  align="center">
    <img src="../assets/linux-bridge.svg" width = "500"  align=center />
    <p>图 2-24 conntrack 示例</p>
</div>


## tun/tap

tun 和 tap 是 Linux 提供的两个相对独立的虚拟网络设备，其中 tap 模拟了网络层设备，工作在 L3，操作 IP 报文，tun 则模拟了以太网设备，工作在 L2，操作的是数据帧。

使用 tun/tap 设备的目的是实现把来自于协议栈的数据包先交由某个打开 /dev/net/tun 字符设备的用户进程处理后，再把数据包重新发回到链路中。
我们可以把 tun/tap 理解为一端连着网络协议栈，另一端连着用户态程序。tun/tap 设备可以将 TCP/IP 协议栈处理好的网络包发送给任何一个使用 tun/tap 驱动的进程，只要协议栈中的数据包能被用户态程序截获并加工处理，就能实现例如数据压缩、流量加密、透明代理等功能。

<div  align="center">
	<img src="../assets/tun.svg" width = "400"  align=center />
	<p>图 2-25 VPN 中数据流动示意图</p>
</div>

tun/tap 设备通常用作 overlay 网络传输，如图示例，应用程序通过 tun 发送数据包，tun 设备如果发现另一读被 VPN 程序打开，便会通过字符设备发送给 VPN，VPN 收到数据包，重新修改成新报文，然后作为报文体，再封装到另一个发送给 B 地址的新报文中，这种将一个数据包封装到另一个数据包的处理方式被称为 “隧道”，隧道技术是构建虚拟逻辑网络的经典做法。

OpenVPN、Vtun、Flannel 等都是基于 tun/tap 实现隧道封装的，在 2.7.1 的 VXLAN 网卡也是一种 tun 设备。但使用 tun/tap 设备传输数据需要经过两次协议栈，会有多次的封包解包，一定的性能损耗，这也是大家所说 Flannel UDP 模式性能较低的原因。
