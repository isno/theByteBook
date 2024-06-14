# 7.6 跨主机通信模型

这一节，我们走进容器网络通信，了解容器间通信的逻辑以及 Kubernetes 集群的网络模型设计。

绝大部分分析跨主机网络的文章都选择 Flannel，这是因为 Flannel 设计足够简单，介绍它的通信流程本书前面铺垫的各类虚拟设备产品呼应关联。它支持的 VXLAN、host-gw 模式也分别对应了跨主机通信的 overlay 模式及三层路由模式，

## 7.6.1 overlay 模式

:::tip 回顾本书 3.5.4 节的内容

overlay 网络是通过封装技术将数据包封装在另一个数据包中，从而在现有网络（underlay 网络）之上创建一个逻辑网络。overlay 网络在虚拟化环境中非常有用，它可以连接分布在不同物理位置的虚拟机、容器、节点等，使它们在一个局域网内一样通信。
:::

不用想，近看看名字就知道 Flannel VXLAN 模式属于典型的 overlay 网络。

:::center
  ![](../assets/fannel-vxlan.svg) <br/>
:::

先解释图中几个虚拟设备：cni0 是一个 Linux bridge；容器与 cni0 之间通过 Veth 连接，flannel.1 充当 VXLAN 模式下的 VETP 设备。

当 Node 启动后加入 Flannel 网络后，Flanneld 会在宿主机中添加如下的路由规则。
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

当 Node1 中的 Container-1 与 Node2 中的 Container-2 通信时，根据上面的路由规则，交由 flannel.1 接口处理，flannel.1 的职责是作为 VXLAN 网络的 VETH 端点负责封包/解包。

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

接着，flannel.1 接续构造外层 VXLAN UDP 报文。flannel.1 得知道四元组信息：源IP、源端口、目的IP、目的端口。

:::tip <a/>
**VTEP 是 VXLAN 隧道的起点或终点**，这意思是 VXLAN UDP 报文的目的 IP 地址即为对端 VTEP 的 IP 地址。目的端口，Linux 内核中默认为 VXLAN 分配的 UDP 监听端口为 8472。
:::

那 flannel.1 如何知道目的 IP 地址呢？这得通过 FDB 表知道。

:::tip FDB 表
FDB表（Forwarding database）用于保存二层设备中 MAC 地址和端口的关联关系，就像交换机中的 MAC 地址表一样。在二层设备转发二层以太网帧时，根据 FDB 表项来找到对应的端口。例如 cni0 网桥上连接了很多 veth pair 网卡，当网桥要将以太网帧转发给 Pod 时，FDB 表根据 Pod 网卡的 MAC 地址查询 FDB 表，就能找到其对应的 veth 网卡，从而实现联通。
:::

使用 bridge fdb show 查看 FDB 表。
```bash
[root@Node1 ~]# bridge fdb show | grep flannel.1
ba:74:f9:db:69:c1 dev flannel.1 dst 192.168.50.3 self permanent
```
它记录着，目的 MAC 地址为 92:8d:c4:85:16:ad 的数据帧封装后，应该发往哪个目的IP。根据上面的记录可以看出，UDP的目的IP应该为192.168.2.103。

至此，flannel.1 已经得到了所有完成 VXLAN 封包所需的信息，然后调用 UDP 协议的发包函数进行发包，后面的过程和本机的UDP程序发包没什么区别了。


当数据包到达 Node2 的 8472 端口后（实际上就是 VXLAN 模块）：
- VXLAN 模块就会比较 VXLAN Header 中的 VNI 和本机的 VTEP 的 VNI 是否一致（所有节点的 flannel1 的VNI都为1，这也是为什么 flannel 叫 flannel.1 的原因）。
- 再比较内层数据帧中的目的 MAC 地址与本机的 flannel.1 MAC 地址是否一致

都一致后，则去掉数据包的 VXLAN Header 和 Inner Ethernet Header，然后把数据包通过 flannel.1 接口发送。

然后，在 Node2 节中上会有如下的路由（由 flanneld 维护），

```bash
[root@peng03 ~]# route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
...
172.26.1.0      0.0.0.0         255.255.255.0   U     0      0        0 cni0
```
上面的，规则 172.26.1.0/24 网段的数据包通过 cni0 网卡发送出去。


## 7.6.3 三层路由模式

## 7.6.4 underlay 模式

underlay 模式就是 2 层互通的底层网络，传统网络大多数属于这种类型。容器网络使用这种组网时，会使用到 IPVLAN（L2 模式）和 MACVLAN 技术。

这种模式所配置的容器网络同主机网络在同一个 LAN 里面，可以具有和主机一样的网络能力，并且没有 Linux Bridge 等方式带来的 Bridge 处理和地址翻译的负担。

最朴素的判断是：Underlay 网络性肯定优于 Overlay 网络。Overlay 网络利用隧道技术，将数据包封装到 UDP 中进行传输。因为涉及数据包的封装和解封，存在额外的 CPU 和网络开销。

underlay 模式的跨主机通信，能最大限度的利用硬件的能力，往往有着**最优先的性能表现**，但也由于它直接依赖硬件和底层网络环境限制，必须根据软硬件情况部署，没有 overlay 那样开箱即用的灵活性。

## 7.6.6 网络插件生态

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