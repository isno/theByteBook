# 3.5.3 Linux 网桥

物理网络中，如果需要连接多个主机，我们会使用网桥（也可以理解为交换机）设备组成一个小型局域网。Linux 网络虚拟化系统中，也提供了网桥虚拟实现 —— Linux Bridge。

Linux Bridge 是 Linux 内核 2.2 版本开始提供的二层转发工具。Linux Bridge 创建以后，一头连着内核协议栈，另一端可以连接多个二层网络设备（Veth、TAP 等等）。

注意的是，网络设备桥接到 “交换机” 上，它的 IP 及 MAC 都不再可用了（退化为 Linux Bridge 的一个端口了）。

:::center
  ![](../assets/linux-bridge.svg)<br/>
 图 3-23 veth 网卡与 Linux Bridge
:::

Linux Bridge 与物理交换机的转发行为是完全一致的，当有二层数据包（帧）从网卡进入 Linux Bridge，它就会根据数据包的类型和目标 MAC 地址，按照如下规则处理：

1. 如果数据包是广播帧，转发给所有桥接到该 Linux Bridge 的设备。
2. 如果数据包是单播帧：
	- 地址转发表（FDB，Forwarding Database）中找不到该 MAC 地址（网桥与交换机类似，会学习 MAC 地址与端口的映射），则洪泛（Flooding）给所有接入网桥的设备，并把响应设备的接口与 MAC 地址学习到自己的 MAC 地址转发表中；
	- 地址转发表中找到了 MAC 地址，则直接转发到地址表中指定的设备。

Linux Bridge 与普通物理交换机非常相似，但还是有点区别，普通的交换机只会做二层转发，**Linux Bridge 还能配置 IP**。网桥设置了 IP 地址的话，就变成 Linux 中的网络设备。Linux 中的网络设备收到数据包，不会转发到任何设备，而是直接交给内核（三层）协议栈处理。

上述设计，最基本的作用是将容器内数据包发出去，笔者举个例子。假设，某个容器配置的网关为 192.168.9.1（Linux bridge 的 IP），然后构造一个目的地为 Node2 IP 的数据包。发出去的数据包先到达 Linux bridge。Linux bridge 作为网络设备将数据包送到主机协议栈。

由于目的 IP 是外网 IP，且宿主机开启了 IP forward 功能，于是数据包会通过 eth0 发送出去。


