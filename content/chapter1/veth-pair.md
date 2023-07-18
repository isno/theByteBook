# Veth Pair

Veth（Virtual Ethernet devices）是 Linux 中一种用软件虚拟出来的模拟硬件网卡的设备，Veth 总是成对出现，所以一般也叫 Veth-Pair。

其作用非常简单：如果 veth0 和 veth1 是一对 veth 设备，veth0 发送的数据会由 veth1收到。反之亦然，其实说白了，Veth就是一根“网线”，你从一头发数据，自然可以从另一头收到数据。

如果读者使用过Docker或者Kubernetes flannel网络框架，查看网络设备信息总能看到一堆 veth 开头的网卡设备信息，这些就是Docker、Kubernetes 为不同ns之间通信而创建的虚拟网卡。

```
$ ip addr
7: veth9c0be5b3@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue master cni0 state UP group default 
    link/ether e2:7c:c8:36:d7:14 brd ff:ff:ff:ff:ff:ff link-netnsid 2
    inet6 fe80::e07c:c8ff:fe36:d714/64 scope link 
       valid_lft forever preferred_lft forever
```

<div  align="center">
	<img src="../assets/veth.png" width = "450"  align=center />
</div>

Veth 的两头都直接连着网络协议栈，所以你创建一个Veth对，主机上就会多两个网卡。

实际上这种虚拟设备我们并不陌生，我们本机网络 IO 里的 lo 回环设备(127.0.0.1)也是这样一个虚拟设备。唯一的区别就是 veth 总是成对地出现。

因为Veth这个特性，它常常充当着一个桥梁，连接着各种虚拟网络设备，典型的例子像“两个namespace之间的连接”，“Bridge、OVS 之间的连接”，“Docker 容器之间的连接” 等等，以此构建出非常复杂的虚拟网络结构。

##  Veth Pair与容器网络

在Network namespace篇节，笔者创建两个netns，并使之通信。就是利用Veth连接两个network namespace，将两端的网卡（Veth）分别放入两个不同的network namespace，就可以把这两个network namespace连起来，形成一个点对点的二层网络。

Docker中经典的容器组网模型就是 veth pair + bridge的模式。

容器中的 `eth0` 实际上就是Host上某个veth成对(pair)关系。如何知道 容器与Host的veth pair关系呢？

在目标容器内执行以下命令

```
$ ip link show eth0
13: eth0@if14: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default 
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
```
从上面可以看到 `eth0@if14` ，其中 `14` 是 eth0 成对的 veth index。

在Host中通过查看 对应的index为14的网卡接口是哪一个 , 从而得到成对的veth pair关系。

```
$ ip link show | grep 14

14: veth7a8d55e4@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue master cni0 state UP group default 
    link/ether a6:7b:18:83:25:db brd ff:ff:ff:ff:ff:ff link-netnsid 1
    inet6 fe80::a47b:18ff:fe83:25db/64 scope link  
```
