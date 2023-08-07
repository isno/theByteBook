# 2.2.2 理解 TCP 拥塞控制

TCP拥塞控制是传输层做的事情，对于常规的应用影响微乎其微，我们只要大致理解拥塞控制原理以及现流行的控制算法就可以。

现在Linux系统常规使用的拥塞控制算法一般是 cubic。版本更高一点的内核会有 bbr 和 bbr2的选择。

Linux内核4.9或更高版本支持TCP BBR, 通过 `uname -r` 查看内核版本

查询系统所支持的拥塞控制算法以及正在使用中的拥塞控制算法。

```
sysctl net.ipv4.tcp_available_congestion_control
sysctl net.ipv4.tcp_congestion_control
```

## 理解拥塞控制

当TCP传输数据时候，中间网络链路复杂且是动态的，中间网关节点瓶颈带宽、路由路径变化、send fuffer 和 receive buffer 、ISP 中的 QoS 策略 等等都影响传输效率，这是一个非常复杂的过程。

Google 发布过一篇 BBR 的论文，文章内有个图片比较清晰的解释了拥塞控制中的各个关系，我们围绕这个图片去理解，就能很好搞懂TCP的拥塞控制。

<div  align="center">
	<img src="../assets/transfer-control.png" width = "500"  align=center />
</div>

我们根据这张图梳理TCP的传输链路，他有几个物理属性：

- **RTprop** (round-trip propagation time). 两端之间最小时延，取决于物理距离。
- **BtlBw**  （bottleneck bandwidth）瓶颈带宽. 把链路想象成物理管道，RTprop 就是管道的长度，BtlBw 则是管道最窄处的直径）。
- **BtlBufSize**  链路之间各个路由节点的缓存。
- **BDP 带宽时延积** 整条物理链路（不含路由器缓存）所能储藏的比特数据之和 BDP = BtlBw * RTprop。

除了上面的物理属性，TCP的传输效率还关注两个现实属性：

- **T（时延）** 数据从发送端到接收端实际时延，也就是RTT，对应于图中的round-trip time
- **R（带宽）** 数据的实际传输带宽，对应于图中的delivery rate
- **D（数据量）** 已发送但还未被确认的数据量, 对应于inflight data

### 拥塞控制的分区

横轴表示 inflight 数据量，有三个关键的区间:

- **(0, BDP)**: 这个区间内，客户端发送的数据并未占满瓶颈带宽。 称为： 应用受限（app limited）区。
- **(BDP, BtlneckBuffSize):** 这个区间内，已经达到链路瓶颈容量，但还未超过瓶颈容量+缓冲区容量，此时应用能发送的数据量主要受带宽限制，称为带宽受限（bandwidth limited）区。
- **(BDP+BtlneckBuffSize, infinity)** ：这个区间内，实际发送速率已经超过瓶颈容量+缓冲区容量 ，多出来的数据会被丢弃，缓冲区大小决定了丢包多少。称为缓冲区受限（buffer limited）区。


通过分析图片的关系：**拥塞（congestion）就是 inflight 数据量持续向右侧偏离 BDP 线的行为，而拥塞控制（congestion control）就是各种在平均程度上控制这种偏离程度的方案或算法**

