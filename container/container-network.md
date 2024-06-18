# 7.6 容器间通信模型

理解了容器镜像、存储以及运行的设计，相信还有个问题应该反复萦绕在你心头：“整个容器集群间到底是怎么通信的？”。

要理解容器间通信，一定要从 Flannel 项目入手，Flannel 是 CoreOS 推出的容器网络解决方案，是公认逻辑清晰、“最简单”的容器解决方案，它支持的两种 VXLAN、host-gw 组网模式，分别对应了跨主机容器方案中 Overlay 和三层路由方式。

## 7.6.1 Overlay 覆盖网络模式

:::tip 回顾本书 3.5.4 节的内容

VXLAN 本质上是一种隧道封装技术，属于典型的 overlay 网络，它使用 TCP/IP 协议栈的惯用手法“封装/解封装技术”，将 L2 的以太网帧（Ethernet frames）封装成 L4 的 UDP 数据报，然后在 L3 的网络中传输，效果就像 L2 的以太网帧在一个广播域中传输一样，
:::

Linux 内核 3.12 版本起已经对 VXLAN 技术支持完备，VXLAN 模块为通信的终端（不同宿主机中的容器）搭建了一个单独的通信通道，也就是隧道。容器间之间的通信，必须通过隧道的两个端点（VETP）对数据封包/解包，这样，通信的两方（容器）就认为它们是在二层网络通信，但实际上还是靠宿主机的三层网络实现。

Flannel 基于 VXLAN 技术的 overlay 网络通信流程可以总结为图。

:::center
  ![](../assets/flannel-vxlan.svg) <br/>
:::

从上图可以看到，容器通过 Veth 桥接到名为 cni0 的 Linux bridge，flannel.1 充当 VXLAN 网络的 VETP 设备，它有 MAC 地址也有 IP 地址。VXLAN 的二层帧由两层构成，内层帧（Inner Ethernet Header）属于 VXLAN 逻辑网络，外网帧属于宿主机网络（Out Ethernet Header
）。

现在，我们看看当 Node1 中的 Container-1 与 Node2 中的 Container-2 通信时，flannel.1 是如何封包/解包，封包/解包数据又如何而来。

首先，当 Node1 启动后加入 Flannel 网络后，Flanneld 会在宿主机中添加如下的路由规则。
```
[node1]# route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
10.224.0.0      0.0.0.0         255.255.255.0   U     0      0        0 cni0
10.224.1.0      10.224.1.0      255.255.255.0   UG    0      0        0 flannel.1
```
上面这两条路由的意思是：
- 凡是发往 10.224.0.0/24 网段的 IP 报文，都需要经过接口 cni0 发出。
- 凡是发往 10.224.1.0/24 网段的 IP 报文，都需要经过接口 flannel.1 发出。并且下一跳的网关地址是 10.224.1.0。

根据上面的路由规则，Container-1 的发出的数据包要交由 flannel.1 接口处理。

当数据包到达 flannel.1 时，flannel.1 需要构造出 VXLAN 内层以太网帧。flannel.1 得知道：源 MAC 地址，目地 MAC 地址。

源 MAC 地址很简单，因为数据包是从 flannel.1 虚拟网卡发出，因此源 MAC 地址为 flannel.1 的 MAC 地址。那的地 MAC 地址呢？也就是 Node2 中 flannel.1 设备的 MAC 地址怎么获取？

实际上这个地址已经由 fanneld 自动添加到 Node1 ARP 表中了，在 Node1 中通过命令查看 。
```bash
[root@Node1 ~]# ip n | grep flannel.1
10.244.1.0 dev flannel.1 lladdr ba:74:f9:db:69:c1 PERMANENT # PERMANENT 表示永不过期
```
上面的记录为 IP 地址 10.244.1.0（Node2 flannel.1 设备的 IP）对应的 MAC 地址是 ba:74:f9:db:69:c1。

:::tip 注意
这里 ARP 表并不是通过 ARP 学习得到的，而是 flanneld 预先为每个节点设置好的，由 flanneld 负责维护，没有过期时间。
:::

现在，已经封装好的二层数据帧属于 VXLAN 这个逻辑网络，里面的 MAC 地址对于宿主机网络没有意义。所以，接下来 Linux 内核还要把这个二层数据帧，进一步封装成宿主机网络中的一个普通二层数据帧。这样内层数据帧作为它的 payload ，通过宿主机 eth0 网卡传输。

为了实现“搭便车”的机制，Linux 内核会在内层数据帧前面塞一个特殊的 VXLAN Header，表示“乘客”，实际是内部 VXLAN 模块使用的数据。

VXLAN header 里面有个重要的标志 VNI，这是 Vetp 设备判断是否属于自己要处理的依据。flannel 网络方案中所有节点中的 flannel1 的 VNI 默认为 1，这也是为什么 flannel 叫 flannel.1 的原因。


接着，Linux 内核接续构造外层 VXLAN UDP 报文，要进行 UDP 封装，就要知道四元组信息：源IP、源端口、目的IP、目的端口。
- Linux 内核中默认为 VXLAN 分配的 UDP 监听端口为 8472
- 目的 IP 则通过 FDB 转发表获得，fdb 表中的数据由 fannel 提前预置。

使用 bridge fdb show 查看 FDB 表。

```bash
[root@Node1 ~]# bridge fdb show | grep flannel.1
ba:74:f9:db:69:c1 dev flannel.1 dst 192.168.50.3 self permanent
```
FDB 记录着目的 MAC 地址为 92:8d:c4:85:16:ad 的数据帧封装后，应该发往哪个目的IP。根据上面的记录可以看出，UDP 的目的 IP 应该为 192.168.2.103，也就是 Node2 宿主机 IP。

至此，Linux 内核已经得到了所有完成 VXLAN 封包所需的信息，然后调用 UDP 协议的发包函数进行发包。

后面的过程和本机的 UDP 程序发包没什么区别了：Linux 内核对 UDP 包封装为宿主机的二层网络数据帧，然后到达 Node2。

继续，再看看 Node2 是如何处理这个数据包的，当数据包到达 Node2 的 8472 端口后：
- VXLAN 模块比较 VXLAN Header 中的 VNI 和本机的 VXLAN 网络的的 VNI 是否一致。
- 再比较内层数据帧中的目的 MAC 地址与本机的 flannel.1 MAC 地址是否一致。

两个判断匹配后，则去掉数据包的 VXLAN Header 和 Inner Ethernet Header，得到最初 container-1 发出的目的地为 100.96.2.3 的 IP 报文。

然后，在 Node2 节中上会有如下的路由（由 flanneld 维护），

```bash
[root@peng03 ~]# route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
...
100.96.2.0      0.0.0.0         255.255.255.0   U     0      0        0 cni0
```

上面的路由规则中，目的地属于 100.96.2.0 /24 网段的数据包通过 cni0 网卡发送出去。后面，就是我们在本书第三章《Linux 网络虚拟化》的内容了。

## 7.6.2 三层路由模式

三层路由模式除了 host-gw 模式外，还有一个更具代表性的项目 Calico，我们由浅入深，先来了解 flannld 是如何实现三层路由，然后再了解 Calico 基于 BGP 的路由模式。

Fannel 的 host-gw 模式的逻辑非常简单，如图所示。

:::center
  ![](../assets/flannel-route.svg) <br/>
:::

假设，现在 Node1 中的 container-1 要访问 Node2 中的 container-2。当设置 Flannel 使用 host-gw 模式之后，flanneld 会在宿主机上创建这样的路由规则。

```bash
$ ip route
100.96.2.0/24 via 10.244.1.0 dev eth0
```
这条路由的意思是，凡是目的地属于 100.96.2.0/24 IP 包，应该通过本机 eth0 设备（dev th0）发出，并且它的下一跳地址是 10.244.1.0 （via 10.244.1.0 ）。

:::tip 下一跳
所谓下一跳，就是 IP 数据包发送时，需要经过某个路由设备的中转，那下一跳的地址就是这个路由的 IP 地址。譬如你个人电脑中配置网关地址 192.168.0.1，意思就是本机发出去的所有 IP 包，都要经过 192.168.0.1 中转。
:::

知道了下一跳地址，接下来 IP 包被封装为二层数据帧，并顺利到达下一跳地址，也就是 Node2 上。同样的，Node2 中也有 flanneld 提前创建好的路由。
```bash
$ ip route
100.10.0.0/24 dev cni0 proto kernel scope link src 100.10.0.1
```
这条路由规则的意思是，凡是目的地目属于 10.244.1.3/24 网段 IP 包，应该被送往 cni0 网桥。后面的逻辑就简单了，就是 Linux bridge 的通信逻辑。

由此可见，Flannel 的 host-gw 模式其实就是将每个容器子网（譬如 Node1 中的 100.10.1.0/24）下一跳设置成了对应的宿主机的 IP 地址，借助宿主机的路由功能，充当容器间通信的“路由网关”，这也是 “host-gw” 名字的由来。

**由于没有封包/解包的额外消耗，也不再需要 flannel.1 虚机网卡，这种通过宿主机路由的方式性能肯定要好于前面介绍的 overlay 模式。但也由于 host-gw 通过下一跳路由，那么肯定无法再被路由网关内，因为不可能再跨越子网通信。**

相信你已经理解了三层路由的原理，接下来，我们再来认识另外一个三层路由容器网络解决方案 - Calico。

Calico 和 Flannel 的原理都是直接利用宿主机的路由功能实现容器间通信，但与 Flannel 的 host-gw 不同的是“**Calico 通过 BGP 实现对路由规则自动化分发**”，因此灵活性更强、更适合大规模容器组网。

:::tip 什么是 BGP
边界网关协议，BGP 使用 TCP 作为传输层的路由协议，用来交互 AS 之间的路由规则。每个 BGP 服务的实例一般称 BGP Router，与 BGP Router 连接的对端叫 BGP Peer。每个 BGP Router 收到了 Peer 传来的路由信息后，经过校验判断之后，就会存储在路由表中。
:::

了解了 BGP 之后，再看 Calico 的架构，就能理解它组件的作用了：
- Felix，负责在宿主机上插入路由规则，相当于 BGP Router。
- BGP Client，BGP 的客户端，负责在集群内分发路由规则，相当于 BGP Peer。

:::center
  ![](../assets/calico-bgp.svg) <br/>
:::

除了对路由信息的维护外，Calico 与 Flannel 的另外一个不同之处是不会设置任何虚拟网桥设备。

从上图可以看到，Calico 并没有创建 Linux bridge，而是把每个 Veth 设备的另一端放置在宿主机中（名字以 cali 为前缀），然后通过路由转发。譬如 Node2 中 container-1 的路由规则如下。
```bash
$ ip route
10.223.2.3 dev cali2u3d scope link
```
这条路由的规则的意思是，发往 10.223.2.3 的数据包，应该进入与 container-1 连接的 cali2u3d 设备。

由此可见，Calico 实际上将集群的每一个节点的容器作为一个 AS，并把节点当做边界路由器，节点之间相互交互路由规则，从而构建了一个联通三层路由连接网络。

## 7.6.3 Underlay 底层网络模式

Underlay 就是 2 层互通的底层网络，传统网络大多数属于这种类型。

这种模式，一般使用 MACVLAN 技术，使配置的容器网络同主机网络在同一个 LAN 里面，因此就具备了和主机一样的网络能力。

由于没有 Linux Bridge 等方式带来的 Bridge 处理和地址翻译的负担。因此，Underlay 模式能最大限度的利用硬件的能力，往往有着**最优先的性能表现**，但也由于它直接依赖硬件和底层网络环境限制，必须根据软硬件情况部署，没有 Overlay 那样开箱即用的灵活性。

## 7.6.4 网络插件生态

Kubernetes 本身不实现集群内的网络模型，而是将其抽象出来提供了 CNI 接口由更专业的第三方提供商实现。把网络变成外部可扩展的功能，需要接入什么样的网络，设计一个对应的网络插件即可。这样一来节省了开发资源可以集中精力到 Kubernetes 本身，二来可以利用开源社区的力量打造一整个丰富的生态。

现如今，支持 CNI 的插件多达二十几种，如下图所示[^1]。

<div  align="center">
	<img src="../assets/cni-plugin.png" width = "500"  align=center />
	<p>CNI 网络插件 [图片来源](https://landscape.cncf.io/guide#runtime--cloud-native-network)</p>
</div>

上述几十种网络插件笔者不可能逐一解释，就简单介绍受到广泛关注的 Calico 和 Cilium 这两款网络解决方案：
- Cilium 的特点功能丰富，容器间通信只是它的子功能之一，是基于 eBPF 构建，将网络、安全和可观察性逻辑直接编程到内核，对工作负载透明，并实现更高的性能。
- Calico 的特点是使用 BGP（边界网关协议）实现容器之间纯三层的路由通信，使用三层路由的方式，网络拓扑简单直观，便于运维排查和解决问题。但由于三层模式是直接在宿主机上进行路由寻址，因此不能用于多租户（宿主机路由存在 CIDR 网络冲突的可性能）。

引用 cilium 官方的测试数据[^1]，了解这两款网络插件性能表现方面（运行 32 个并行的 netperf 进程，按 TCP-CRR 的策略测试 cilium 与 Calico 的每秒请求数以及资源占用情况）。

:::tip TCP-CRR
表示在一次 TCP 链接中只进行一组Request/Response 通信即断开
:::

<div  align="center">
	<img src="../assets/bench_tcp_crr_32_processes.png" width = "500" align=center />
	<p>性能表现</p>
</div>
<div  align="center">
	<img src="../assets/bench_tcp_crr_32_processes_cpu.png" width = "500"  align=center />
	<p>资源占用表现</p>
</div>

从结果上看，综合吞出量、延迟表现或者资源占用的表现 Cilium 无疑非常出色。

最后，考虑对于容器编排系统来说，网络并非孤立的功能模块，还要能提供各类的网络访问策略能力支持，譬如 Kubernetes 的 Network Policy 这种用于描述 Pod 之间访问这类 ACL 策略以及加密通信，这些明显不属于 CNI 范畴，因此并不是每个 CNI 插件都会支持这些额外的功能。


[^1]: 参见 https://cilium.io/blog/2021/05/11/cni-benchmark/