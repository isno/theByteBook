# 2.2.2 虚拟以太网设备 Veth 

Veth（Virtual Ethernet）是 Linux 中一种用软件虚拟出来的模拟硬件网卡的设备，Veth 总是成对出现，所以有时候也叫 Veth pair。

Veth 的作用很简单，就是连接不同的 Network Namespace，简单理解，Veth 就是一根带两个 Ethernet 网卡的`网线`，从一头发数据，自然可以从另一头收到数据。 如果 veth0 和 veth1 是一对 Veth 设备，veth0 发送的数据会由 veth1 收到。反之亦然。

因为 Veth 这个特性，它常常充当着一个桥梁，连接着宿主机内的虚拟网络，典型的例子像两个 Network Namespace 之间的连接、Bridge 和 OVS 之间的连接等，通过这种方式，从而构建出复杂的虚拟网络拓扑架构。

因为 Veth 的两头都直接连着网络协议栈，所以创建一个 Veth 对，主机上就会多两个网卡。我们在 Kubernetes 集群中的宿主机查看，总能看到一堆 veth 开头的网卡设备信息，这些就是为不同 Pod 之间通信而创建的虚拟网卡。

在 Kubernetes 宿主机中查看网卡设备：
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
