#Overlay网络与VXLAN

不同宿主机之间的容器怎么通信呢？答案就是：Overlay网络

Overlay是Underlay在其上封装的业务网络，与服务更贴近，通过VXLAN 或者GRE等协议封装，给用户提供一个易用的网络服务


在前面的文章，通过讲解了Veth和Bridge，我们了解了一个宿主机内不同容器间的通信：通过创建一个共用的网桥，将不同的容器接入该网桥，使他们二层可达。
实际上Overlay网络也是利用了这种思想，通过软件的方式构建一个“跨主机的” 网桥，让他们像处在一个局域网内，互相可以发现、通信。

如果了解隧道协议，就能明白Overlay的通信方式了。

其原理就是：我们将物理机A中的容器a发往物理机B中的容器b的网络包，进行一次封包。 在外层加上物理机A发往物理机B的IP包。这时候数据包可以顺利到达物理机B。

物理机B收到数据包之后再进行解包，解开的包再发给该物理机下的容器b， 这时候不同物理机之间的容器即实现了通信。

这种在底层网络之上使用隧道技术对原始报文进行封包解包的方式构建的逻辑互联网络称之为Overlay网络。

Overlay网络原有的网络架构几乎没有影响，不需要对原网络做任何改动，就可以架设一层新的网络，是目前最主流的容器跨节点数据传输和路由方案


Overlay网络实现有很多，比如GRE、VXLAN的Overlay网络实现，因为在后续我们使用了K8S网络插件Flannel，这里便只进行讲解VXLAN


## VXLAN


在讲VXLAN之前，我们先聊聊它的前身XLAN。

VLAN 的全称是“虚拟局域网”（Virtual Local Area Network），它是一个二层（数据链路层）的网络，用来分割广播域。 

当局域网内有大量主机时，如果只有一个广播域，则该局域网络中会充斥着大量的广播帧（ARP、DHCP、RIP）等等，这种情况这不仅会消耗网络带宽，也会造成局域网内每个主机CPU处理广播无谓消耗。

VLAN技术则把一个LAN划分成多个逻辑的VLAN每个VLAN是一个广播域，VLAN内的主机间通信就和在一个LAN内一样，而VLAN间则不能直接互通，广播报文就被限制在一个VLAN 内， 如下图所示：

<div  align="center">
	<img src="/assets/chapter4/xlan.png" width = "550"  align=center />
</div>

然而VLAN有两个明显的缺陷，第一个缺陷在于VLAN Tag的设计，定义VLAN的802.1Q规范是在 1998 年提出的，只给VLAN Tag预留了 32 Bits的存储空间，其中只有12Bits 才能用来存储VLAN ID。

当云计算数据中心出现后，即使不考虑虚拟化的需求，单是需要分配IP的物理设备都有可能数以万计甚至数以十万计，这样4096个VLAN 肯定是不够用的。

VLAN第二个缺陷在于它本身是一个二层网络技术，但是在两个独立数据中心之间信息只能够通过三层网络传递，云计算的发展普及很多业务有跨数据中心运作的需求，所以数据中心间传递 VLAN Tag 又是一件比较麻烦的事情；

并且在虚拟网络中，一台物理机会有多个容器，容器与VM相比也是呈数量级增长，每个虚拟机都有独立的IP地址和MAC地址，这样带给交换机的压力也是成倍增加。

基于上面的问题，VXLAN呼之欲出

## VXLAN

VXLAN（Virtual eXtensible LAN）是一种支持组播的隧道技术，跟GRE等其他实现Overlay网络的方式一样，VXLAN需要一个能进行封包解包的设备，称之为 vtep，在vxlan的Overlay网络中，vtep除了封解包，还要维护本机的虚机、容器网络信息。

当有虚机、容器上线时，需要向vtep注册，vtep也借此知晓本机下所有虚机的信息。

### VXLAN的通信原理

每个vtep在创建时，需要加入到一个组播里，里面是整个集群机器的vtep集合，当需要找目标虚拟机又不知道归属哪台物理机时就在组里发起arp广播，直到有管理该目标虚拟机的arp回应。

这就跟局域网通信非常相似，通过IP地址广播获得物理地址。vtep通过arp定位虚拟机所出物理机的vtep设备。




### VXLAN报文

VXLAN采用 L2 over L4 （MAC in UDP）的报文封装模式，把原本在二层传输的以太帧放到四层 UDP 协议的报文体内，同时加入了自己定义的 VXLAN Header。

在VXLAN Header里直接就有 24 Bits的VLAN ID，同样可以存储1677万个不同的取值，VXLAN让二层网络得以在三层范围内进行扩展，不再受数据中心间传输的限制。

VXLAN 工作在二层网络（IP网络层），只要是三层可达（能够通过IP互相通信）的网络就能部署VXLAN 。

<div  align="center">
	<img src="/assets/chapter4/vxlan-data.png" width = "500"  align=center />
</div>

上图我们可以看到 VXLAN 报文对原始 Original Layer2 Frame 进行了包装：

- VXLAN Header 8字节，其中包含24Byte 的 VNI 字段，用来定义VXLAN网络中不同的租户，可以存储 1677 万个不同的取值
- UDP Header，其中 VXLAN 头和原始以太帧一起作为 UDP 的数据，头中目的端口号（VXLAN Port）固定为4789，源端口按流随机分配（通过 MAC，IP，四层端口号进行 hash 操作）， 这样可以更好的做 ECMP。
- Outer IP Header 封装外层IP头，封装了目的IP地址和源IP地址，这里 IP 指的是宿主机的 IP 地址
- Outer MAC Header 封装外层以太头，封装了源MAC地址，目的MAC地址，这里 MAC 地址指的是宿主机 MAC 地址

## VXLAN模型

<div  align="center">
	<img src="/assets/chapter4/vxlan-net.png" width = "550"  align=center />
</div>

从上面图 VXLAN 网络网络模型中我们可以发现 VXLAN 网络中出现了以下几个组件：

- VTEP（VXLAN Tunnel Endpoints，VXLAN隧道端点）：VXLAN 网络的边缘设备，是 VXLAN 隧道的起点和终点，负责 VXLAN 协议报文的封包和解包，也就是在虚拟报文上封装 VTEP 通信的报文头部。。VTEP 可以是网络设备（比如交换机），也可以是一台机器（比如虚拟化集群中的宿主机）；
- VNI（VXLAN Network Identifier）：前文提到，以太网数据帧中VLAN只占了12比特的空间，这使得VLAN的隔离能力在数据中心网络中力不从心。而 VNI 的出现，就是专门解决这个问题的。一般每个 VNI 对应一个租户，并且它是个 24 位整数，也就是说使用 VXLAN 搭建的公有云可以理论上可以支撑最多1677万级别的租户；
- VXLAN 隧道：隧道是一个逻辑上的概念，在 VXLAN 模型中并没有具体的物理实体想对应。隧道可以看做是一种虚拟通道，VXLAN 通信双方（图中的虚拟机）认为自己是在直接通信，并不知道底层网络的存在。从整体来说，每个 VXLAN 网络像是为通信的虚拟机搭建了一个单独的通信通道，也就是隧道

## VXLAN通信过程

VXLAN 网络中通常 VTEP 可能会有多条隧道，VTEP 在进行通信前会通过查询转发表 FDB 来确定目标 VTEP 地址，转发表 FDB 用于保存远端虚拟机/容器的 MAC 地址，远端 VTEP IP，以及 VNI 的映射关系，而转发表通过泛洪和学习机制来构建。目标MAC地址在转发表中不存在的流量称为未知单播（Unknown unicast）。VXLAN 规范要求使用 IP 多播进行洪泛，将数据包发送到除源 VTEP 外的所有 VTEP。目标 VTEP 发送回响应数据包时，源 VTEP 从中学习 MAC 地址、VNI 和 VTEP 的映射关系，并添加到转发表中。

下面我们看看首次通信过程看看 VTEP 是如何学习的：

<div  align="center">
	<img src="/assets/chapter4/vxlan-process.png" width = "600"  align=center />
</div>


- 由于是首次进行通信，VM-A 上没 VM-B 的 MAC 地址，所以会发送 ARP 广播报文请求 VM-B 的 MAC 地址。VM-A 发送源 MAC 为 VM-A 、目的 MAC 为全F、源 IP 为 IP-A、目的 IP 为 IP-B 的 ARP 广播报文，请求VM-B 的 MAC 地址；
- VTEP-1 收到 ARP 请求后，根据二层子接口上的配置判断报文需要进入 VXLAN 隧道。VTEP-1 会对报文进行封装，封装的外层源 IP 地址为本地 VTEP（VTEP-1）的 IP 地址，外层目的 IP 地址为对端 VTEP（VTEP-2 和VTEP-3）的 IP 地址；外层源 MAC 地址为本地 VTEP 的 MAC 地址，而外层目的 MAC 地址为去往目的 IP 的网络中下一跳设备的 MAC 地址；
- 报文到达VTEP-2和VTEP-3后，VTEP对报文进行解封装，得到VM-A发送的原始报文。然后 VTEP-2 和 VTEP-3 根据二层子接口上的配置对报文进行相应的处理并在对应的二层域内广播。VM-B 和 VM-C 接收到 ARP 请求后，比较报文中的目的IP地址是否为本机的IP地址。VM-C 发现目的IP不是本机IP，故将报文丢弃；VM-B 发现目的IP是本机IP，则对ARP请求做出应答；
- VM-B 会根据请求的 ARP 包进行 ARP 应答报文为单播报文，报文源 MAC 为MAC-B，目的 MAC 为 MAC-A，源 IP 为 IP-B 、目的 IP 为 IP-A；
- VTEP-2 接收到 VM-B 发送的 ARP 应答报文后，识别报文所属的 VNI，VTEP-2 对报文进行封装。封装的外层源IP地址为本地 VTEP（VTEP-2）的 IP 地址，外层目的IP地址为对端 VTEP（VTEP-1）的IP地址；外层源MAC地址为本地 VTEP 的 MAC 地址，而外层目的MAC地址为去往目的IP的网络中下一跳设备的MAC地址；
- 报文到达 VTEP-1 后，VTEP-1 对报文进行解封装，得到 VM_B 发送的原始报文。同时，VTEP-1 学习VM_B 的MAC地址、VNI 和远端 VTEP 的IP地址（IP-2）的对应关系，并记录在本地 MAC 表中。之后，VTEP-1 将解封装后的报文发送给VM-A；
- 至此，VM-A 就收到了 ARP 广播报文响应 VM-B 的 MAC 地址；


除了上面这种多播的方式进行学习的方式来获取 MAC <--> VNI <--> VTEP IP这一组映射关系以外还有一种方式，就是分布式的控制中心。

例如 Flannel 的 VXLAN 模式网络中的 VTEP 的 MAC 地址并不是通过多播学习的，而是通过 apiserver 去做的同步（或者是etcd）。

每个节点在创建 Flannel 的时候，各个节点会将自己的VTEP信息上报给 apiserver，而apiserver 会再同步给各节点上正在 watch node api 的 listener(Flanneld)，Flanneld 拿到了更新消息后，再通过netlink下发到内核，更新 FDB（查询转发表） 表项，从而达到了整个集群的同步。这个 apiserver 就起到了分布式的控制中心的作用， 不再需要发送多余的请求去满网络访问获取对应的映射信息。

## 使用docker实践 VXLAN的通信

在两台虚机中创建两个容器
```
## VM1
[root@localhost ~]# docker run -itd --net mynetwork --ip 172.17.0.10 centos
## VM2
[root@localhost ~]# docker run -itd --net mynetwork --ip 172.17.0.11 centos

--net指定自定义网络
--ip指定IP地址
centos指定image
```

上面我们虽然创建好了网络，但是我们直接进去是无法通信的：

```
[root@localhost ~]#  docker exec -it 5a2e519610bb /bin/bash

[root@5a2e519610bb /]# ping  172.17.0.11
PING 1172.17.0.11 (172.17.0.11) 56(84) bytes of data.
From 172.17.0.11 icmp_seq=1 Destination Host Unreachable

--- 172.17.0.11 ping statistics ---
11 packets transmitted, 0 received, +8 errors, 100% packet loss, time 10007ms
pipe 4
```

下面我们在两个容器宿主机上各创建一个VXLAN接口，并且将VXLAN接口接入docker网桥的端口上：

```
## VM1
[root@localhost ~]#  ip link add vxlan_docker type vxlan id 200 remote 192.168.13.132 dstport 4789 dev ens33
[root@localhost ~]#  ip link set vxlan_docker up
[root@localhost ~]#  brctl addif br-87133e370c6c vxlan_docker

## VM2
[root@localhost ~]#  ip link add vxlan_docker type vxlan id 200 remote 192.168.13.131 dstport 4789 dev ens33
[root@localhost ~]#  ip link set vxlan_docker up
[root@localhost ~]#  brctl addif br-26d918129b18 vxlan_docker
```

上面我们分别使用 ip link add为 VM1 和 VM2 分别创建了创建 VNI 为200的 VXLAN 网络接口，名称为vxlan_docker；然后使用 brctl addif 把新创建的VXLAN接口vxlan_docker接入到 docker 网桥中。

然后我们进入到容器中发现可以 ping 通了：

```
[root@5a2e519610bb /]# ping  172.18.0.11
PING 172.18.0.11 (172.18.0.11) 56(84) bytes of data.
64 bytes from 172.18.0.11: icmp_seq=1 ttl=64 time=1.14 ms
64 bytes from 172.18.0.11: icmp_seq=2 ttl=64 time=0.620 ms
^C
--- 172.18.0.11 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1002ms
rtt min/avg/max/mdev = 0.620/0.879/1.139/0.261 ms
```

下面在宿主机上抓包：

```
[root@localhost ~]#  tcpdump -i ens33 host 192.168.13.131 -s0 -v -w vxlan_vni_1.pcap

```

<div  align="center">
	<img src="/assets/chapter4/vxlan-tcpdump.png" width = "600"  align=center />
</div>

上面我们看到，首先是发送出 ARP 请求获取 MAC 地址，外层是 UDP 报文，目的端口是4789，目的 IP 是宿主机 VM2 的 IP；VXLAN 报文头 VNI 是200 ；ARP 请求源 MAC 地址是 VM1 里面发送消息的容器 MAC 地址，目的地址没有获取到，为 ff:ff:ff:ff:ff:ff；

在收到回包之后，172.18.0.11回复 ARP 响应包告知 MAC 地址是 02:42:ac:12:00:0b，然后就可以正常发送 ICMP 包了。