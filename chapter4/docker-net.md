# 网络虚拟化

随着Linux网络虚拟化技术的演进，有了若干种虚拟化网络设备，在虚机以及容器网络中得到了广泛的应用。典型的有网络虚拟化设备有 Tap/Tun、Veth、Bridge等。

网络虚拟化作为SDN的基础实现，实质上是用软件虚拟出vNIC、vSwitch、vRouter等硬件设备，再进行配置相应的转发规则，其对外的接口也符合其所在物理网络协议规范（如 Ethernet、TCP/IP协议族等）

当然虚拟机和容器网络在传输流程上还是有些区别，前者比如KVM一般使用Tap设备将虚拟机的vNIC和宿主机的网络Bridge连接起来。 而容器的Bridge网络模式是将不同的Namespace里面的Veth Pair连接网桥Bridge来实现通信。

## Network Namespce

Network Namespce（后续简称netns）是Linux内核提出一项实现网络隔离的功能，它可以为不同的命名空间从逻辑上提供独立的网络协议栈，具体包括网络设备、路由表、arp表、iptables、以及套接字（socket）等。

这就使得不同的网络空间就都好像运行在独立的网络中一样。

docker也是基于 netns实现的网络隔离，通过netns隔离不同容器之间的协议栈，避免相互影响和污染。


<div  align="center">
	<img src="/assets/chapter4/net-namespace.png" width = "450"  align=center />
</div>


创建新的netns：
```
ip netns add netns1
```

接下来我们检查一下这个 netns 的路由表、Iptables及网络设备等信息：

```
[root@VM-12-14-centos ~]# ip netns exec netns1 route
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface

[root@VM-12-14-centos ~]# ip netns exec netns1 iptables -L
Chain INPUT (policy ACCEPT)
target     prot opt source               destination         

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination         

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination 

[root@VM-12-14-centos ~]# ip netns exec netns1 ip link list
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

由于是新创建的 netns，以上所有信息都为空，只存在一个状态为 down 的 lo 设备。


## 解决不同netns之间的通信

不同的网络命名空间之间是相互隔离的，所以不同的网络命名空间之间并不能直接通信。
比如在 网络命名空间A 配置了一个 IP 地址为 172.17.42.1 的设备，但在 网络命名空间B 里却不能访问， 这就好比两台电脑，如果没有任何网线连接，它们之间是不能通信的， 为了解决这种问题，Linux 内核提供了 虚拟网络设备对（veth） 这个功能，用于处理不同网络命名空间之间的通信。

### Veth

Veth（Virtual Ethernet devices）是 Linux 中一种用软件虚拟出来的模拟硬件网卡的设备。

veth 总是成对出现，所以一般也叫 veth-pair。其作用非常简单：如果 v-a 和 v-b 是一对 veth 设备，v-a 发送的数据会由 v-b 收到。反之亦然，其实说白了，Veth就是一根“网线”，你从一头发数据，自然可以从另一头收到数据。

<div  align="center">
	<img src="/assets/chapter4/veth.png" width = "500"  align=center />
</div>


Veth 的两头都直接连着网络协议栈，所以你创建一个Veth对，主机上就会多两个网卡，实际上这种虚拟设备我们并不陌生，我们本机网络 IO 里的 lo 回环设备(127.0.0.1)也是这样一个虚拟设备。唯一的区别就是 veth 总是成对地出现。

因为Veth这个特性，它常常充当着一个桥梁，连接着各种虚拟网络设备，典型的例子像“两个namespace之间的连接”，“Bridge、OVS 之间的连接”，“Docker 容器之间的连接” 等等，以此构建出非常复杂的虚拟网络结构。


在 Linux 我们可以使用 ip 命令创建一对 veth，使用 ip link add 创建一对 veth0@veth1 的网卡， ip link 表示这是一个链路层的接口：

```
ip link add veth1 type veth peer name veth1-peer
```

### veth的创建实验

下面我们使用ip命令，构造一个 ns1 和 ns2 利用 veth 通信的过程，看看veth是如何收发请求包

```
# 创建两个namespace
ip netns add ns1
ip netns add ns2

# 通过ip link命令添加vethDemo0和vethDemo1
ip link add veth1 type veth peer name veth1-peer
```

使用 ip link show 来进行查看，此时可以看到，veth1@veth1-peer 相互连接：

```
[root@VM-12-14-centos ~]# ip link show
16: veth1-peer@veth1: <BROADCAST,MULTICAST,M-DOWN> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether 6e:f2:2c:e0:05:5a brd ff:ff:ff:ff:ff:ff
17: veth1@veth1-peer: <BROADCAST,MULTICAST,M-DOWN> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether 32:10:1a:0f:97:03 brd ff:ff:ff:ff:ff:ff
```
将 veth1 这头添加到我们刚才创建的 netns1 中：
```
ip link set veth1 netns ns1
ip link set veth1-peer netns ns2

```
此时再进行检查会发现 veth 已经不见了，因为设备已经到了netns中：


接下来为这对 veth 配置 IP 并启动设备
```

// 在不同的 netns 下需要使用 ip netns exec $name 到指定的 netns 下执行
ip netns exec ns1 ip addr add 172.16.0.1/24 dev veth1
ip netns exec ns1 ip link set dev veth1 up

ip netns exec ns2 ip addr add 172.16.0.2/24 dev veth1-peer
ip netns exec ns2 ip link set dev veth1-peer up

```
然后我们可以看到 namespace 里面设置好了各自的虚拟网卡以及对应的ip：

```
[root@VM-12-14-centos ~]# ip netns exec ns1 ip addr

17: veth1@if16: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 32:10:1a:0f:97:03 brd ff:ff:ff:ff:ff:ff link-netnsid 1
    inet 172.16.0.1/24 scope global veth1
       valid_lft forever preferred_lft forever
    inet6 fe80::3010:1aff:fe0f:9703/64 scope link 
       valid_lft forever preferred_lft forever
```

现在我们可以尝试这对 veth 是否可以相互通信：

```
[root@VM-12-14-centos ~]# ip netns exec ns1 ping 172.16.0.2
PING 172.16.0.2 (172.16.0.2) 56(84) bytes of data.
64 bytes from 172.16.0.2: icmp_seq=1 ttl=64 time=0.046 ms
...
```


分析上面的流程：

- ns1中的ping进程构造ICMP包，通过socket发给协议栈
- 协议栈根据目的IP地址和系统路由表，知道去 172.16.0.2 的数据包应该要由 172.16.0.1 口出去
- 协议栈将 ARP 包交给 veth1，让它发出去
- 由于 veth1 的另一端连的是 veth1-peer，所以ARP请求包就转发给了 veth1-peer
- veth1-peer 收到 ARP 包后，转交给另一端的协议栈，做出 ARP 应答

如上所见，无论是从 netns 中向宿主机发起通信，还是从宿主机向 netns 中的设备发起通信，都是可以行，到目前为止我们已经实现了点对点的通信。


## Bridge

在上文中的Veth-Pair中提到了利用Veth连接两个不同的ns， 但在现在的环境下，一台宿主机通常有几十个、几百个容器服务，这也就意味着有几百个ns，这种情况下ns之间怎么互联呢？

我们查看Docker中支持的网络模式：host（共享宿主机网络）、bridge模式、无网络模式
```
[root@VM-12-14-centos ~]# docker network ls
NETWORK ID     NAME      DRIVER    SCOPE
f11992d39917   bridge    bridge    local
9de01a2b732d   host      host      local
1d9d9bba02f5   none      null      local
```

bridge就是解决了宿主机中不同ns之间的通信，bridge就相当于软件模拟硬件中的交换机，Docker 利用Bridge再依靠 veth-pair 连接到 docker0 网桥上与宿主机乃至外界的其他机器通信的。

<div  align="center">
    <img src="/assets/chapter4/bridge.png" width = "500"  align=center />
</div>

### bridge工作流程

我们在安装Docker之后，Docker Demon将会创建一个linux虚拟以太网桥 docker0，默认情况下主机内所有的容器会连接到该网桥，它通过 Veth将 容器与网桥进行连接，然后通过iptables NAT规则和主机上的eth0网卡交换数据。

#### 默认及自定义bridge网络

使用docker inspect命令可以查看默认网桥的配置，从下面的config中看到16位掩码的子网是172.17.0.0/16，我们创建容器时，如果不指定网络会将该容器网络默认添加到这个子网内。
```
[root@VM-12-14-centos ~]# docker inspect bridge
[
    {
        "Name": "bridge",
        "Id": "f11992d39917e5e55c815ed069a71827b93c30d37afbb486b56013cdc4bcf449",
        "Created": "2022-11-11T11:30:52.551234904+08:00",
        "Scope": "local",
        "Driver": "bridge",
        "EnableIPv6": false,
        "IPAM": {
            "Driver": "default",
            "Options": null,
            "Config": [
                {
                    "Subnet": "172.17.0.0/16"
                }
            ]
        },
```

创建一个容器，通过inspect查看 bridge和容器信息，显然 172.17.0.1 在子网 172.17.0.0/16下

```
[root@VM-12-14-centos ~]# docker run -d -t --name nginx nginx
102c7afd4643e7e0a675c3691c0c8eeb77ccbfe5f5265ab3c78ccfca26769dbe
[root@VM-12-14-centos ~]# docker inspect bridge
...
        "Containers": {
            "102c7afd4643e7e0a675c3691c0c8eeb77ccbfe5f5265ab3c78ccfca26769dbe": {
                "Name": "nginx",
                "EndpointID": "769ce3b0bdab3a5c808db76d21707f4688c7347019ff70107b9b97d72a611aa4",
                "MacAddress": "02:42:ac:11:00:02",
                "IPv4Address": "172.17.0.2/16",
                "IPv6Address": ""
            }
        },
```

有时候生产环境中，我们为了防止不必要的容器被加入到生产子网中，我们可以手动创建一个bridge，运行容器时，通过指定 net参数容器和生产子网隔离。


```
docker network create --driver bridge --subnet 172.16.0.0/16 --gateway 172.16.0.1 test-bridge
docker run -d -t --net test-bridge --name  test-nginx nginx
```

### bridge的工作原理

在前面说过bridge是利用Veth-pair进行通信，接下来我们从实际中看看这其中的管理信息。

使用brctl show来查看一下 Linux网桥以及对应的接口

```
[root@VM-12-14-centos ~]# brctl show
bridge name bridge id       STP enabled interfaces
br-d95e6583199d     8000.02426d088269   no      vethe9eddd4
docker0     8000.0242cd275c98   no      veth1bdda3e
```
可以看到默认的docker0网桥接入了veth1bdda3e中， 同样我们使用ip addr来查看接口信息，可以确认veth1bdda3e所属的网桥也正是docker0

```
[root@VM-12-14-centos ~]# ip addr
19: veth1bdda3e@if18: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP group default 
    link/ether c6:35:ff:eb:51:9d brd ff:ff:ff:ff:ff:ff link-netnsid 3
    inet6 fe80::c435:ffff:feeb:519d/64 scope link 
       valid_lft forever preferred_lft forever
```

我们再进入容器中查看，同样存在接口， 如此一来，虚拟设备对Veth Pair就存在了，网桥与容器的通讯也水到渠成。

```
[root@8e4d8b15a47b /]# ip addr 
23: eth0@if24: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether 02:42:ac:11:00:03 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.3/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```
### 外界通信

```
[root@VM-12-14-centos ~]# iptables -t nat -vnL
Chain POSTROUTING (policy ACCEPT 1263 packets, 79494 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 MASQUERADE  all  --  *      !br-d95e6583199d  172.16.0.0/16        0.0.0.0/0           
   67  4201 MASQUERADE  all  --  *      !docker0  172.17.0.0/16        0.0.0.0/0      
```

POSTROUTING链会将所有来自 172.17.0.0/16的流量伪装成宿主机网卡发出。 容器的流量通过NAT后服务端并没有感知，只知道源自宿主机网卡的流量。相当于SNAT。

我们再看看DNAT，我们启动一个端口映射

```
[root@VM-12-14-centos ~]# docker run -d -p 8888:80 nginx 

```
查看 iptables

```
Chain DOCKER (2 references)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 RETURN     all  --  br-d95e6583199d *       0.0.0.0/0            0.0.0.0/0           
    0     0 RETURN     all  --  docker0 *       0.0.0.0/0            0.0.0.0/0           
    0     0 DNAT       tcp  --  !docker0 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8888 to:172.17.0.2:80
```

此时通过tcp/8888端口的流量会被转发到172.17.0.2:80，这也是为什么使用docker要开启 net.ipv4.ip_forward转发的原因。

