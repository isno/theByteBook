# 2.3.4 使用 BBR 提升数据传输效率

服务器的带宽是 1 Gbps，用户家里的入网带宽 500 Mbps，但是观看一个视频确速率只有 `1~2 Mbp/s`，这是怎么回事？在本节，我们先分析拥塞控制的原理、方法，再实践使用更好的拥塞控制算法提升数据传输效率。相信读者就能明白以上问题。

现在 Linux 系统常规使用的拥塞控制算法一般是 cubic。版本更高内核 4.9+ 会有 bbr 选择。查询系统所支持的拥塞控制算法以及正在使用中的拥塞控制算法。

```
$ sysctl net.ipv4.tcp_available_congestion_control
net.ipv4.tcp_congestion_control = bbr cubic reno
$ sysctl net.ipv4.tcp_congestion_control
net.ipv4.tcp_congestion_control = cubic
```

## 理解拥塞控制

当TCP传输数据时候，中间网络链路复杂且是动态的，中间网关节点瓶颈带宽、路由路径变化、send fuffer 和 receive buffer 、ISP 中的 QoS 策略 等等都影响传输效率，这是一个非常复杂的过程。

Google 发布过一篇 BBR 的论文，文章内有个图片比较清晰的解释了拥塞控制中的各个关系，我们围绕这个图片去理解，就能很好搞懂TCP的拥塞控制。

<div  align="center">
	<img src="../assets/transfer-control.png" width = "500"  align=center />
</div>

我们根据这张图梳理TCP的传输链路，他有几个物理属性：

- **RTprop** (round-trip propagation time)，两端之间最小时延，取决于物理距离。
- **BtlBw**（bottleneck bandwidth）瓶颈带宽，把链路想象成物理管道，RTprop 就是管道的长度，BtlBw 则是管道最窄处的直径）。
- **BtlBufSize**  链路之间各个路由节点的缓存。
- **BDP 带宽时延积** 整条物理链路（不含路由器缓存）所能储藏的比特数据之和 BDP = BtlBw * RTprop。

除了上面的物理属性，TCP的传输效率还关注两个现实属性：

- **T（时延）** 数据从发送端到接收端实际时延，也就是RTT，对应于图中 round-trip time。
- **R（带宽）** 数据的实际传输带宽，对应图中的 delivery rate。
- **D（数据量）** 已发送但还未被确认的数据量, 对应图 inflight data。

### 拥塞控制的分区

横轴表示 inflight 数据量，有三个关键的区间:

- **(0, BDP)**: 这个区间内，客户端发送的数据并未占满瓶颈带宽。 称为： 应用受限（app limited）区。
- **(BDP, BtlneckBuffSize):** 这个区间内，已经达到链路瓶颈容量，但还未超过瓶颈容量+缓冲区容量，此时应用能发送的数据量主要受带宽限制，称为带宽受限（bandwidth limited）区。
- **(BDP+BtlneckBuffSize, infinity)** ：这个区间内，实际发送速率已经超过瓶颈容量+缓冲区容量 ，多出来的数据会被丢弃，缓冲区大小决定了丢包多少。称为缓冲区受限（buffer limited）区。


通过分析图片的关系：**拥塞（congestion）就是 inflight 数据量持续向右侧偏离 BDP 线的行为，而拥塞控制（congestion control）就是各种在平均程度上控制这种偏离程度的方案或算法**

## 使用 BBR 提升互联网数据传输效率

随着全球化互联网迅速普及，网卡由最初的 Mbps 到 Gbps，路由网关的内存也从 KB 到 GB，跨洋长链路的出现，4G/5G/WiFi无线网络的应用等等因素，造成的影响就是：带宽时延积越来越大，链路层和物理层误码导致的随机丢包会时常出现，这就导致丢包和拥塞之间的关系也变得愈发微弱，

而常规的拥塞控制算法从 TCP-Reno 到 Linux 默认的 Cubic 算法，主要的思想是基于丢包的拥塞控制策略，依靠丢失数据包的迹象作为减缓发送速率的信号。在高 BDP 环境中基于丢包来判断拥塞这种由事件驱动调整拥塞窗户非常被动，难在现代网络环境中发挥作用，无法充分利用带宽。


TCP 的 BBR（Bottleneck Bandwidth and Round-trip propagation time，BBR）是谷歌在2016年开发的一种新型的 TCP 拥塞控制算法。BBR 尝试通过使用全新的拥塞控制来解决这个问题，它使用基于延迟而不是丢包作为决定发送速率的主要因素。


## BBR的改善

使用 BBR，可以获得显著的网络吞吐量的提升和延迟的降低。

吞吐量的改善在远距离路径上尤为明显，比如跨太平洋的文件或者大数据的传输，尤其是在有轻微丢包的网络条件下。

延迟改善主要体现在最后一公里的路径上，而这一路径经常受到缓冲膨胀（BtlBufSize）的影响。当网络链路拥塞时，就会发生缓冲膨胀，从而导致数据包在这些超大缓冲区中长时间排队。在先进先出队列系统中，过大的缓冲区会导致更长的队列和更高的延迟，并且不会提高网络吞吐量。由于 BBR 并不会试图填满缓冲区，所以在避免缓冲区膨胀方面往往会有更好的表现。



