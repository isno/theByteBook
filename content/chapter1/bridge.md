# 不同netns之间通信解决：Linux Bridge

在上文中提到了利用Veth连接两个不同的ns，但在现在的环境下，一台宿主机通常有几十个、几百个容器服务，这也就意味着有几百个ns，这种情况下 veth 就显得捉襟见肘。这个时候就需要 Linux Bridge登场了。

顾名思义，Linux Bridge 是Linux系统中的网桥。 Linux Bridge与其他网络设备的区别在于：普通的网络设备只有两端，从一端进来的数据会从另一端出去。比如，物理网卡接收的网络数据会转发给内核协议栈，内核协议栈收到的数据会转发给物理网卡，而 Linux Bridge 则有多个端口，数据可以从任何端口进入，哪个出口出去取决于目的地 Mac 地址，bridge就相当于软件模拟硬件中的交换机。



Docker中支持中bridge网络模式，就是docker利用Bridge 再依靠 veth-pair 连接到 docker0 网桥上与宿主机乃至外界的其他机器通信的。


<div  align="center">
    <img src="../assets/bridge.png" width = "500"  align=center />
</div>