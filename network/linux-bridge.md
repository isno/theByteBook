# 3.5.4 虚拟交换机 Linux Bridge

在物理网络中，交换机用于连接多台主机，组成局域网。在 Linux 网络虚拟化技术中，同样提供了物理交换机的虚拟实现，即 Linux Bridge（Linux 网桥，也称虚拟交换机）。

Linux Bridge 作为虚拟交换机，其功能与物理交换机类似。将多个网络接口（如物理网卡 eth0、虚拟接口 veth、tap 等）桥接后，它们的通信方式与物理交换机的转发行为一致。当数据帧进入 Linux Bridge 时，系统根据数据帧的类型和目的地 MAC 地址执行以下处理：
- **广播帧**：转发到所有桥接到该 Linux Bridge 的设备。
- **单播帧**：查找 FDB（Forwarding Database，地址转发表）中 MAC 地址与设备网络接口的映射记录：
	- 若未找到记录，执行“洪泛”（Flooding），将数据帧发送到所有接口，并根据响应将设备的网络接口与 MAC 地址记录到 FDB 表中；
	- 若找到记录，则直接将数据帧转发到对应设备的网络接口。

以下是一个具体例子，展示如何使用 Linux Bridge 将两个网络命名空间连接到同一二层网络。网络拓扑如图 3-15 所示。

:::center
  ![](../assets/linux-bridge.svg)<br/>
 图 3-15 veth 网卡与 Linux Bridge
:::

1. 首先，创建一个 Linux Bridge 设备。如下命令所示，创建一个名为 br0 的虚拟交换机，并将其激活。

```bash
$ ip link add name br0 type bridge
$ ip link set br0 up
```

2. 接着，创建一对 Veth 设备，并将它们分别分配给两个命名空间。

```bash
# 创建 veth1 和 veth2
$ ip link add veth1 type veth peer name veth2

# 将 veth1 分配到 ns1
$ ip link set veth1 netns ns1
# 将 veth2 分配到 ns2
$ ip link set veth2 netns ns2
```

3. 将 veth1 和 veth2 接入到 br0 桥接设备，从而让它们成为同一二层网络的一部分。

```bash
# 将 veth1 添加到 br0 桥接
$ ip link set dev veth1 up
$ brctl addif br0 veth1

# 将 veth2 添加到 br0 桥接
$ ip link set dev veth2 up
$ brctl addif br0 veth2
```

4. 为每个命名空间中的 Veth 设备配置 IP 地址。

```bash
# 配置命名空间1中的 veth1
$ ip netns exec ns1 ip addr add 172.16.0.1/24 dev veth1
$ ip netns exec ns1 ip link set veth1 up

# 配置命名空间2中的 veth2
$ ip netns exec ns2 ip addr add 172.16.0.2/24 dev veth2
$ ip netns exec ns2 ip link set veth2 up
```

4. 最后，在 ns1 命名空间中测试与 ns2 命名空间的通信。

```bash
$ ip netns exec ns1 ping 172.16.0.2
PING 172.16.0.2 (172.16.0.2) 56(84) bytes of data.
64 bytes from 172.16.0.1: icmp_seq=1 ttl=64 time=0.153 ms
64 bytes from 172.16.0.1: icmp_seq=2 ttl=64 time=0.148 ms
64 bytes from 172.16.0.1: icmp_seq=3 ttl=64 time=0.116 ms
```

通过上述步骤，我们创建了一个 Linux Bridge，将两个命名空间 ns1 和 ns2 通过虚拟以太网设备连接在同一个二层网络中。这样，两个命名空间之间可以通过桥接设备直接通信，实现在同一局域网内的网络互通。

需要补充的是，Linux Bridge 本质上是 Linux 系统中的虚拟网络设备，具备网卡特性，能够配置 MAC 和 IP 地址。从主机的角度来看，配置了 IP 地址的 Linux Bridge 设备就相当于一块“网卡”，能够参与数据包的 IP 路由。因此，当网络命名空间的默认网关设置为 Linux Bridge 的 IP 地址时，原本隔离的网络命名空间便能够与主机进行通信。

实现容器与主机之间的互通，是容器间通信的关键环节。笔者将在第七章的 7.6 节中详细阐述这方面的内容。


