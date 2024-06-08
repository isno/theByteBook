# 3.5.1 网络命名空间

Linux 内核源于对资源隔离的需求，从 2.4.19 版本起陆续开始支持各类命名空间技术对资源进行隔离。

网络命名空间（Network Namespace）是其中的一种，它是实现 Linux 网络虚拟化的核心，它能创建多个隔离的网络空间，空间内的防火墙、网卡、路由表、邻居表、协议栈等与外部独立，当进程运行在一个独立的命名空间时，就像是一台单独的物理主机一样。

:::center
  ![](../assets/network-namespace.svg)<br/>
 图 3-19 网络命名空间
:::

由于每个容器都有自己的网络服务，在网络命名空间的作用下，这就使得一个主机内运行两个同时监听 80 端口的 Nginx 服务成为可能（当然，外部访问还需宿主机 NAT）。

Linux ip 工具的子命令 netns 集成了网络命名空间的增删查改功能，笔者使用 ip 命令进行操作实践，以便读者了解其过程。

创建新的网络命名空间。

```bash
$ ip netns add ns1
```
当 ip 命令创建一个网络命名空间时，系统会在 /var/run/netns 生成一个挂载点。挂载点的作用是方便对命名空间进行管理，另一方面也使得命名空间即使没有进程运行也能持续存在。

查询该命名空间的基本信息，由于没有任何配置，因此该命名空间下只有一块状态为 DOWN 的本地回环设备 lo。

```bash
$ ip netns exec ns1 ip link list 
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

继续查看该命名空间下 iptables 规则配置，由于是一个初始化的命名空间，所以也并没有任何规则。

```bash
$ ip netns exec ns1 iptables -L -n
Chain INPUT (policy ACCEPT)
target     prot opt source               destination         

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination         

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination 
```

由于不同的命名空间之间相互隔离，所以同一个宿主机之内的命名空间并不能直接通信，如果想与外界（譬如其他网络命名空间、宿主机）进行通信，就需要在命名空间里面插入 veth（虚拟网卡/网线），然后再把 veth 的另一头连接到 Linux Bridge（虚拟交换机）。

没错，这些操作完全和物理环境中的局域网配置一样，只不过全部是虚拟的、用软件实现的而已。
