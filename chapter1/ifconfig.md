# ifconfig

ifconfig 命令用于获取网卡配置与网络状态等信息。

常见使用方法：

- 列出所有网卡额配置信息： ifconfig
- 只列出指定网卡的配置信息： ifconfig + 网卡名称  如 ifconfig etho

```
[root@VM-12-12-centos ~]# ifconfig eth0
eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 10.0.12.12  netmask 255.255.252.0  broadcast 10.0.15.255
        inet6 fe80::5054:ff:feb8:2665  prefixlen 64  scopeid 0x20<link>
        ether 52:54:00:b8:26:65  txqueuelen 1000  (Ethernet)
        RX packets 205482559  bytes 58983864960 (54.9 GiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 225178576  bytes 61377168609 (57.1 GiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

这里我们需要关注几个跟网络性能密切相关的指标。

**网络接口的状态标志**

ifconfig 输出中的 RUNNING ，都表示物理网络是连通的，即网卡已经连接到了交换机或者路由器中。如果看不到它们，通常表示网线连接有问题。

**MTU大小**

MTU 默认大小是 1500，根据网络架构的不同（比如是否使用了 VXLAN 等叠加网络），你可能需要调大或者调小 MTU 的数值。

**网络接口的 IP 地址、子网以及 MAC 地址**

这些都是保障网络功能正常工作所必需的，需要确保配置正确

**网络收发相关数据**

网络收发的字节数、包数、错误数以及丢包情况，特别是 TX 和 RX 部分的 errors、dropped、overruns、carrier 以及 collisions 等指标不为 0 时，通常表示出现了网络 I/O 问题， 其中

- errors 表示发生错误的数据包数，比如校验错误、帧同步错误等；
- dropped 表示丢弃的数据包数，即数据包已经收到了 Ring Buffer，但因为内存不足等原因丢包；
- overruns 表示超限数据包数，即网络 I/O 速度过快，导致 Ring Buffer 中的数据包来不及处理（队列满）而导致的丢包；
- carrier 表示发生 carrirer 错误的数据包数，比如双工模式不匹配、物理电缆出现问题等；
- collisions 表示碰撞数据包数。