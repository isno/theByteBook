# 2.3.1 RX/TX 优化指南

从 图 2-5 得知，处理一个数据包会有各类的中断、softirq 等处理，因为分配给 Ring Buffer 的空间是有限的，当收到的数据包速率大于单个 CPU 处理速度的时，Ring Buffer 可能被占满并导致新数据包被自动丢弃。一个 CPU 去处理 Ring Buffer 数据会很低效，这个时候就产生 RSS、RPS 等多核并发机制来提升内核网络包的处理能力。

但是注意，开启多核并发特性，会挤压业务代码的执行时间，如果业务属于 CPU 密集型，会导致业务性能下降。是否开启多核处理，需要根据业务场景考虑，根据笔者的经验来看，例如此类负载均衡服务器、网关、集群核心转发节点等网络I/O 密集型场景可以尝试优化 RSS、RPS 等配置。

## 1. 判断是否需进行优化

当类似 LVS、集群核心交换节点、负载均衡服务器的场景 PPS（Packet Per Second，包每秒）指标存在一定的优化空间且这些核心节点影响了集群业务，那我们可以查看系统状态以决定是否进行内核优化。

首先我们确定是否存在丢包状况，如果存在则进行相应的调整。查询网卡收包情况 (RX 为收到的数据、TX 为发送的数据)。

```
$ ifconfig eth0 | grep -E 'RX|TX'

RX packets 490423734  bytes 193802774970 (180.4 GiB)
RX errors 12732344  dropped 9008921  overruns 3723423  frame 0
TX packets 515280693  bytes 140609362555 (130.9 GiB)
TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

以上查询结果中，RX dropped 表示数据包已经进入了 Ring Buffer，但是由于内存不够等系统原因，导致在拷贝到内存的过程中被丢弃，RX overruns 错误为 Ring Buffer 传输的 IO 大于 kernel 能够处理的 IO 导致，为 CPU 无法及时处理中断而造成 Ring Buffer 溢出。


## 2. RSS 下的多队列调整

RSS（receive side steering）利用网卡多队列特性，将每个核分别跟网卡的一个首发队列绑定，以达到网卡硬中断和软中断均衡的负载在各个 CPU 中，RSS 要求网卡必须要支持多队列特性。（注意：对于大部分驱动，修改以下配置会使网卡先 down 再 up，因此会造成丢包！）

### 2.1 多队列调整

查询 RX/TX 队列配置和使用情况。

```
$ ethtool -l eth0

Channel parameters for eth0:
Pre-set maximums:
RX:		0
TX:		0
Other:		0
Combined:	8
Current hardware settings:
RX:		0
TX:		0
Other:		0
Combined:	4
```

可以看到硬件最多支持 6 个，当前使用了 4 个。将 RX 和 TX queue 数量都设为 8。
```
$ ethtool -L eth0 combined 8
```

### 2.2 队列大小调整

增大 ring buffer 可以在 PPS（packets per second）很大时缓解丢包问题。

查看队列大小。

```
$ ethtool -g eth0

Ring parameters for eth0:
Pre-set maximums:
RX:		1024
RX Mini:	0
RX Jumbo:	0
TX:		1024
Current hardware settings:
RX:		512
RX Mini:	0
RX Jumbo:	0
TX:		512
```
以上输出显示网卡最多支持 1024 个 RX/TX 数据包大小，但是现在只用到了 512 个。 ethtool -G 修改 queue 大小。

```
$ ethtool -G eth0 rx 1024
```
