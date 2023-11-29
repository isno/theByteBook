# 网络命名空间

Linux 的命名空间（namespace）提供了一种内核级别隔离系统资源的方法，通过将系统的全局资源放在不同的命名空间中以实现资源隔离的目的。

笔者举个例子，说明这种隔离的特性，加入有两个进程 A 和进程 B 分别属于两个不同的命名空间，进程 A 将可以独立地使用 Linux 内核提供的所有命名空间资源，例如主机名、文件系统、进程编号等等。进程 B 同样也可以使用同类资源，但其资源与进程 A 使用的资源相互隔离，彼此无法感知。从用户层面来看，进程 A 读写属于 A 的命名空间资源，进程 B 读写属于 B 的命名空间资源，它们之间彼此安全隔离。

各类的容器技术利用 Linux 命名空间的特性，从而实现了容器之间资源隔离。毫不夸张地说命名空间是整个 Linux 虚拟化，甚至更进一步也可以说是前云计算潮流的基石。

Linux 通过对内核资源进行封装抽象，提供了八类系统资源的隔离（namespace）：

|  类型   | 描述  |
|  ----  | ----  |
| Cgroup  | Cgroup root directory cgroup 根目录 |
| IPC  | System V IPC, POSIX message queues 信号量，消息队列 |
| Network  | Network devices, stacks, ports, etc.网络设备，协议栈，端口等等 |
| Mount  | Mount points 挂载点 |
| PID  | Process IDs 进程号 |
| User  | 用户和组 ID |
| UTS  | 系统主机名和 NIS(Network Information Service) 主机名（有时称为域名） |
| Time  | 时钟 |

如同名字，Network namespace（网络命名空间) 是 Linux 内核提供的用于实现网络虚拟化的核心，它能创建多个隔离的网络空间，该网络空间内的防火墙、网卡、路由表、邻居表、协议栈与外部独立，不管是虚拟机还是容器，当运行在独立的命名空间时，就像是一台单独的物理主机。

<div  align="center">
	<img src="../assets/network-namespace.svg" width = "550"  align=center />
	<p>图 2-21 Network namespace</p>
</div>

由于每个容器都有自己的网络服务, 在网络命名空间的作用下，这就使得一个主机内运行两个同时监听 80 端口的 Nginx 服务成为可能（当然，外部访问还需宿主机 NAT）。

Linux ip 工具的子命令 netns 集成了网络命名空间的增删查改功能，笔者这里使用 ip 命令进行操作实践，以便读者了解其过程。

创建新的网络命名空间。

```plain
ip netns add ns1
```

当 ip 命令创建一个网络命名空间时，系统会在 /var/run/netns 生成一个挂载点。挂载点的作用是方便对命名空间进行管理，另一方面也使得命名空间即使没有进程运行也能持续存在。

查询该命名空间的基本信息，由于没有任何配置，因此该命名空间下只有一块状态为 DOWN 的本地回环设备 lo。

```plain
$ ip netns exec ns1 ip link list 
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

继续查看该命名空间下 iptables 规则配置，由于是一个初始化的命名空间，所以也并没有任何规则。

```plain
$ ip netns exec ns1 iptables -L -n
Chain INPUT (policy ACCEPT)
target     prot opt source               destination         

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination         

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination 
```

由于不同的命名空间之间相互隔离，所以同一个宿主机之内的命名空间并不能直接通信，如果想与外界（其他 Network namespace、或者宿主机）进行通信，就需要在命名空间里面，插入虚拟网卡（Veth），连接到虚拟交换机（Bridge），就像配置一个物理环境中的局域网，配置完连接信息之后，它们之间就可以正常通信了。