# 3.3.1 网卡多队列优化

内核处理一个数据包会有各类的中断处理、协议栈封装转换等繁琐流程，当收到的数据包速率大于单个 CPU 处理速度的时，因为分配给 RX/TX 队列的空间是有限的，Ring Buffer 可能被占满并导致新数据包被自动丢弃。

如果在多核 CPU 的服务器上，网卡内部会有多个 Ring Buffer，网卡负责将传进来的数据分配给不同的 Ring Buffer，同时触发的中断也可以分配到多个 CPU 上处理，这样存在多个 Ring Buffer 的情况下 Ring Buffer 缓存的数据也同时被多个 CPU 处理，就能提高数据的并行处理能力。

当然，要实现“网卡负责将传进来的数据分配给不同的 Ring Buffer”，网卡必须支持 Receive Side Scaling(RSS) 或者叫做 multiqueue 的功能。RSS 除了会影响到 NIC 将 IRQ 发到哪个 CPU 之外，不会影响别的逻辑。

## 1. 判断是否需进行优化

诸如集群核心交换节点、负载均衡服务器等场景的 PPS（Packet Per Second，包每秒）指标存在一定的优化空间且这些核心节点影响了集群业务，那我们可以查看系统状态以决定是否进行内核优化，首先我们确定是否存在丢包状况。

查询网卡收包情况 (RX 为收到的数据、TX 为发送的数据)。

```plain
$ ifconfig eth0 | grep -E 'RX|TX'

RX packets 490423734  bytes 193802774970 (180.4 GiB)
RX errors 12732344  dropped 9008921  overruns 3723423  frame 0
TX packets 515280693  bytes 140609362555 (130.9 GiB)
TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

以上查询结果中，RX dropped 表示数据包已经进入了 Ring Buffer，但是由于内存不够等系统原因，导致在拷贝到内存的过程中被丢弃，RX overruns 错误为 Ring Buffer 传输的 IO 大于 kernel 能够处理的 IO 导致，为 CPU 无法及时处理中断而造成 Ring Buffer 溢出。

## 2. RSS 下的多队列调整

RSS（receive side steering，多队列处理）利用网卡多队列特性，将每个核分别跟网卡的一个首发队列绑定，以达到网卡硬中断和软中断均衡的负载在各个 CPU 中，RSS 要求网卡必须要支持多队列特性。（注意：对于大部分驱动，修改以下配置会使网卡先 down 再 up，因此会造成丢包！）

### 2.1 多队列调整

查询 RX/TX 队列配置和使用情况。

```plain
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

可以看到硬件最多支持 6 个，当前使用了 4 个。将 RX/TX 队列数量都设为 8。
```plain
$ ethtool -L eth0 combined 8
```

### 2.2 队列大小调整

增大 RX/TX 队列大小可以在 PPS（packets per second，包每秒）很大时缓解丢包问题。

1. 首先查看队列大小。

```plain
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
以上输出显示网卡最多支持 1024 个 RX/TX 数据包大小，但是现在只用到了 512 个。

2. 通过 ethtool -G 命令修改队列大小。
```plain
$ ethtool -G eth0 rx 1024
```

但是注意开启多核并发特性，会挤压业务代码的执行时间，如果业务属于 CPU 密集型，会导致业务性能下降。是否开启多核处理，需要根据业务场景考虑。例如负载均衡服务器、网关、集群核心转发节点等网络 I/O 密集型场景可以尝试优化 RSS、RPS 等配置。
