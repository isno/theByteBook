# 3.4.1 网卡多队列优化

:::tip 丢包的产生
当收到的数据包速率大于单个 CPU 处理速度的时，因为分配给 RX/TX 队列的空间是有限的，RingBuffer 可能被占满并导致新数据包被自动丢弃。
:::

在多核 CPU 的服务器上，只用一个 CPU 去处理 RingBuffer 数据会很低效，那是否能用多个 CPU 并行处理数据包？

这个时候就产生了叫做 Receive Side Scaling(RSS) 或者叫做 multiqueue 的机制来处理这个问题。

简单说就是支持 RSS 的网卡内部会有多个 RingBuffer，网卡收到数据包时能通过哈希函数决定数据包放在哪个 RingBuffer 上，触发的 IRQ 也可以通过操作系统或者手动配置 IRQ affinity 将 IRQ 分配到多个 CPU 上。

这样 IRQ 能被不同的 CPU 处理，从而做到 RingBuffer 上的数据也能被不同的 CPU 处理，从而提高数据的并行处理能力。

## 1. 判断是否需进行优化

那些集群核心交换节点、负载均衡服务器等严苛关注 PPS（Packet Per Second，包每秒）指标的场景，可以查看系统状态以决定是否进行内核优化。

首先，确定是否存在丢包状况，查询网卡收包情况 (RX 为收到的数据、TX 为发送的数据)。

```bash
$ ifconfig eth0 | grep -E 'RX|TX'

RX packets 490423734  bytes 193802774970 (180.4 GiB)
RX errors 12732344  dropped 9008921  overruns 3723423  frame 0
TX packets 515280693  bytes 140609362555 (130.9 GiB)
TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

以上查询结果中：
- RX dropped 表示数据包已经进入了 RingBuffer，但是由于内存不够等系统原因，导致在拷贝到内存的过程中被丢弃；
- RX overruns 表示 RingBuffer 传输的 IO 大于 内核能够处理的 IO，导致 CPU 无法及时处理中断而造成 RingBuffer 溢出。

如果 overruns 数出现异常，就要看看网卡有没有正常配置多队列了。

## 2. RSS 下的多队列调整

查询 RX/TX 队列配置和使用情况。

```bash
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
可以看到硬件最多支持 8 个，但当前使用了 4 个。

将 RX/TX 队列数量都设为 8。（注意：对于大部分驱动，修改以下配置会使网卡先 down 再 up，因此会造成丢包！）

```bash
$ ethtool -L eth0 combined 8
```

## 3. 队列大小调整

增大 RX/TX 队列大小可以在 PPS 很大时缓解丢包问题。

1. 首先查看队列大小。

```bash
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
输出显示网卡最多支持 1024 个 RX/TX 数据包大小，但是现在只用到了 512 个。

2. 通过 ethtool -G 命令修改队列大小。
```bash
$ ethtool -G eth0 rx 1024
```

注意开启多核并发特性，会挤压业务代码的执行时间，如果业务属于 CPU 密集型，会导致业务性能下降。是否开启多核处理，请根据业务场景考虑。

那些网络密集型场景，譬如负载均衡服务器、网关、集群核心转发节点建议确认 RSS、RPS 配置情况，做到充分利用硬件性能。
