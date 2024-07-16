# 3.4.1 网卡多队列优化

:::tip 丢包的产生
当收到的数据包速率大于单个 CPU 处理速度的时，因为分配给 RX/TX 队列的空间是有限的，RingBuffer 可能被占满并导致新数据包被自动丢弃。
:::

为了提高网络数据包的并行处理能力，大部分的网卡都支持 RSS（Receive Side Scaling）技术，RSS 技术简单来说就是网卡内部会有多个 RingBuffer，网卡收到数据包时能通过哈希函数决定数据包放在哪个 RingBuffer 上，从而做到 RingBuffer 上的数据也能被不同的 CPU 处理。

网络密集型的业务，例如负载均衡服务器、网关服务器等，得注意 RSS 是否正确配置，做到充分利用硬件性能。


## 1. 数据包收发队列配置

通过 ethtool 命令查询 eth0 网卡的队列配置情况，其中 RX 为收到的数据、TX 为发送的数据。

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
可以看到硬件最多支持 8 个队列，但当前使用了 4 个队列。

将 RX/TX 队列数量都设为 8 （注意：对于大部分网卡驱动，修改以下配置会使网卡先 down 再 up，因此会造成丢包！）。

```bash
$ ethtool -L eth0 combined 8
```

## 2. 数据包队列大小调整

除了队列的数量调整，我们再继续看看队列大小的配置情况。

查看收发数据包的队列大小情况。

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
输出的结果显示，RX/TX 队列最多支持 1024 个，但是现在只用到了 512 个。

通过 ethtool -G 命令修改队列大小。

```bash
$ ethtool -G eth0 rx 1024
```

最后，得注意开启多核并发特性，会挤压业务代码的执行时间，如果业务属于 CPU 密集型，会导致业务性能下降。是否开启多核处理，请根据业务场景考虑。
