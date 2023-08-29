# 2.5.1 网络命名空间 Network Namespace

在 Linux 系统中，namespace 是一种用来隔离内核资源的机制，目前 Linux 提供了八类系统资源的隔离 Cgroup、IPC、Network、PID 等（Namespace 内容详见本书 第七章 2.1 小节）。而其中 Network Namespace 的作用用来隔离网络资源。

Network Namespace（后续简称 netns） 是 Linux 内核提供的用于实现网络虚拟化的核心，它能创建多个隔离的网络空间，该网络空间内的防火墙、网卡、路由表、邻居表、协议栈与外部独立，不管是虚拟机还是容器，当运行在独立的命名空间时，就像是一台单独的物理主机。


<div  align="center">
	<img src="../assets/net-namespace.png" width = "450"  align=center />
</div>

由于每个容器都有自己的网络服务, 在 Network Namespace 的作用下，这就使得一个主机内运行两个同时监听 80 端口的 Nginx 服务成为可能（当然，外部访问还需宿主机 NAT）。

Linux ip 工具的子命令 netns 集成了 Network Namespace 的增删查改功能，我们使用 ip 命令进行操作。

创建新的 Network Namespace：

```
ip netns add ns1
```

当 ip 命令创建一个 Network Namespace 时，系统会在 /var/run/netns 生成一个挂载点。挂载点的作用是方便对 namespace 进行管理，另一方面也使得 namespace 即使没有进程运行也能持续存在。

查询该 Network Namespace 的基本信息，由于没有任何配置，因此该 netns 下，只有一块状态为 DOWN 的本地回环设备lo。

```
$ ip netns exec ns1 ip link list 
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

继续查看该 netns 下 iptables 规则配置，由于是一个初始化的 Namespace，所以也并没有任何规则。

```
$ ip netns exec ns1 iptables -L -n
Chain INPUT (policy ACCEPT)
target     prot opt source               destination         

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination         

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination 
```

由于不同的 Network Namespace 之间相互隔离，所以同一个宿主机之内的 Network Namespace 之间并不能直接通信。如果想与外界（其他 Network Namespace、或者宿主机）进行通信，就需要在 Network Namespace 里面，插入虚拟网线（Veth），连接到虚拟交换机（Bridge），这样就像一个物理环境中的以太网了，他们之间就可以正常通信了。