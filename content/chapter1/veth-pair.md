# veth pair

如果读者安装过docker或者k8s，查看网络设备信息，总能看到一堆veth开头的网卡设备信息，这些就是docker、k8s 为不同ns之间通信而创建的虚拟网卡。 

```
$ ip addr
7: veth9c0be5b3@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue master cni0 state UP group default 
    link/ether e2:7c:c8:36:d7:14 brd ff:ff:ff:ff:ff:ff link-netnsid 2
    inet6 fe80::e07c:c8ff:fe36:d714/64 scope link 
       valid_lft forever preferred_lft forever
```

## 什么是 Veth
Veth（Virtual Ethernet devices）是 Linux 中一种用软件虚拟出来的模拟硬件网卡的设备。

veth 总是成对出现，所以一般也叫 veth-pair。其作用非常简单：如果 veth0 和 veth1 是一对 veth 设备，veth0 发送的数据会由 veth1收到。反之亦然，其实说白了，Veth就是一根“网线”，你从一头发数据，自然可以从另一头收到数据。

<div  align="center">
	<img src="../assets/veth.png" width = "450"  align=center />
</div>

Veth 的两头都直接连着网络协议栈，所以你创建一个Veth对，主机上就会多两个网卡。

实际上这种虚拟设备我们并不陌生，我们本机网络 IO 里的 lo 回环设备(127.0.0.1)也是这样一个虚拟设备。唯一的区别就是 veth 总是成对地出现。

因为Veth这个特性，它常常充当着一个桥梁，连接着各种虚拟网络设备，典型的例子像“两个namespace之间的连接”，“Bridge、OVS 之间的连接”，“Docker 容器之间的连接” 等等，以此构建出非常复杂的虚拟网络结构。