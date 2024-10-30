# 3.5.4 虚拟交换机 Linux bridge

在物理网络中，通常通过交换机连接多台主机，组成小型局域网。而在 Linux 网络虚拟化技术中，也提供了交换机的虚拟实现，即 Linux 网桥（Linux bridge）。

Linux bridge 作为虚拟交换机，具备与物理交换机相似的功能。当一个或多个网络接口（如物理网卡 eth0、虚拟接口 veth、tap 等）加入到 Linux bridge 后，这些接口的通信方式将与物理交换机的转发行为保持一致。

当一个数据帧进入 Linux bridge 时，它根据数据帧的类型和目的地 MAC 地址，按照如下规则理：

- 如果是广播帧，转发给所有桥接到该 Linux bridge 的设备。
- 如果是单播帧，查看 FDB（地址转发表）中 MAC 地址与网络设备接口的映射：
	- 如找不到记录，则洪泛（Flooding）给所有接入网桥的设备，并把响应设备的网络接口与 MAC 地址记录到 FDB 表中；
	- 如找到记录，则将数据帧转发至对应的接口。

举一个具体的例子，使用 Linux bridge 将两个命名空间接入到同一个二层网络。该例子的网络拓扑结构如图 3-15 所示。

:::center
  ![](../assets/linux-bridge.svg)<br/>
 图 3-15 veth 网卡与 Linux Bridge
:::

创建 Linux bridge 与其他虚拟网络设备类似，只需将 type 参数指定为 bridge 即可。

```bash
$ ip link add name br0 type bridge
$ ip link set br0 up
```

创建的 Linux bridge 一端连接到主机协议栈，而其他端口尚未连接任何设备。为了实现其功能，需要将其他设备连接到该 bridge。接下来，我们将创建网络命名空间和 veth 设备，并将 veth 的一端连接到网络命名空间，另一端连接到刚创建的 br0 桥接设备。

```bash
# 创建网络命名空间
$ ip netns add ns1
$ ip netns add ns2

# 创建 veth 网线
$ ip link add veth0 type veth peer name veth1
$ ip link add veth2 type veth peer name veth3

# 将 veth 网线的一端连接到网络命名空间内
$ ip link set veth0 netns ns1
$ ip link set veth2 netns ns2

# 将 veth 另一端连接到 br0
$ ip link set dev veth1 master br0
$ ip link set dev veth3 master br0
```

激活网络命名空间内的虚拟网卡，并为它们设置 IP 地址。这些 IP 地址位于同一个子网 172.16.0.0/24 中。

```bash
# 配置命名空间1
$ ip netns exec ns1 ip link set veth1 up
$ ip netns exec ns1 ip addr add 172.16.0.1/24 dev veth1
# 配置命名空间2
$ ip netns exec ns2 ip link set veth2 up
$ ip netns exec ns2 ip addr add 172.16.0.2/24 dev veth2
```

接下来，检查网络命名空间之间是否可达。

```bash
ip netns exec ns1 ping 172.16.0.2
PING 172.16.0.2 (172.16.0.2) 56(84) bytes of data.
64 bytes from 172.16.0.1: icmp_seq=1 ttl=64 time=0.153 ms
64 bytes from 172.16.0.1: icmp_seq=2 ttl=64 time=0.148 ms
64 bytes from 172.16.0.1: icmp_seq=3 ttl=64 time=0.116 ms
```

通过上述实验，我们验证了使用 Linux bridge 可以将多个命名空间连接到同一个二层网络中。

你可能注意到，我们只为命名空间内的 veth 接口分配了 IP 地址，而没有为连接到 Linux bridge 的另一端分配地址。这是因为 Linux bridge 工作在数据链路层（二层），主要处理以太网帧，包括 ARP 解析、以太网帧的转发和泛洪。

但与物理二层交换机不同的是，Linux bridge 本质上是 Linux 系统中的虚拟网络设备，具备网卡特性，可以配置 MAC 和 IP 地址。从主机的角度来看，配置了 IP 的 Linux bridge 设备相当于主机上的一张网卡，能够参与数据包的路由和转发。因此，当将网络命名空间的默认网关设置为 Linux bridge 的 IP 地址时，原本隔离的网络命名空间便可以与主机进行网络通信。

实现容器与主机之间的互通是容器跨主机通信的关键步骤。笔者将在第七章的 7.6 节中详细阐述容器跨主机通信的原理。


