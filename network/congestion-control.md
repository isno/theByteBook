# 2.3.3 使用 BBR 提升数据传输效率

笔者所负责的业务中，曾做过提升 CDN 网络吞吐量的工作，主要的实践是尝试使用了 BBR 算法。在本节，笔者对拥塞控进行简单地讲解，以供读者在后续实践中参考。

TCP 中对拥塞控制算法分类有基于延迟改变 (Reno)、丢包反馈(Cubic)、主动探测(BBR) 这几类实现代表。Linux 系统常规使用的拥塞控制算法一般是 Cubic，内核 4.9+ 增加了 BBR 算法支持，而 Reno 已不再使用。

查询系统所支持的拥塞控制算法。
```
$ sysctl net.ipv4.tcp_available_congestion_control
net.ipv4.tcp_congestion_control = bbr cubic reno
```
查询正在使用中的拥塞控制算法

```
$ sysctl net.ipv4.tcp_congestion_control
net.ipv4.tcp_congestion_control = cubic
```
，指定拥塞控制算法为 bbr。

```
$ echo net.ipv4.tcp_congestion_control=bbr >> /etc/sysctl.conf && sysctl -p
```

## 1. 理解拥塞控制

正常情况下，程序员完全不需关注拥塞控制，拥塞控制是一个很复杂的过程，两端网络链路其一是动态变化的，其二中间网络设备 buffer 影响、ISP 中的 QoS 策略 等等都影响传输效率，整个过程非常难以理解（部分机制笔者至今也是云里雾里）。

笔者在配置 BBR，参阅文章时，注意到 Google 一篇 BBR 论文中一张拥塞控制逻辑配图，该配图对拥塞控制有一个完整的概括。

<div  align="center">
	<img src="../assets/transfer-control.png" width = "500"  align=center />
</div>

我们根据这张图梳理传输链路，有几个物理属性需要关注。

- **RTprop** (round-trip propagation time)，两端之间最小时延，取决于物理距离。
- **BtlBw**（bottleneck bandwidth）瓶颈带宽，把链路想象成物理管道，RTprop 就是管道的长度，BtlBw 则是管道最窄处的直径。
- **BtlBufSize**  链路之间各个路由节点的缓存。
- **BDP 带宽时延积** 整条物理链路（不含路由器缓存）所能储藏的比特数据之和 BDP = BtlBw * RTprop。

除了上面的物理属性，传输效率还依赖以下几个属性：

- **round-trip time** 数据从发送端到接收端实际时延，也就是RTT。
- **delivery rate** 数据的实际传输带宽。
- **inflight data** 已发送但还未被确认的数据量。

## 2. 拥塞控制的分区

在横轴对 bufferbloat 的划分，有三个关键的区间：

- **(0, BDP)**:该区间客户端发送的数据并未占满瓶颈带宽。称为：应用受限（app limited）区。
- **(BDP, BtlneckBuffSize):** 该区间已经达到链路瓶颈容量，但还未超过瓶颈容量+缓冲区容量，此时应用能发送的数据量受带宽限制，称为带宽受限（bandwidth limited）区。
- **(BDP + BtlneckBuffSize, infinity)** ：该区间实际发送速率已经超过瓶颈容量+缓冲区容量 ，多出来的数据会被丢弃，缓冲区大小决定了丢包多少。称为缓冲区受限（buffer limited）区。

通过分析图片的关系：**拥塞就是 inflight 数据量持续向右侧偏离 BDP 线的行为（在接近第三区间时，传输效率最高），而拥塞控制就是各种在平均程度上控制这种偏离程度解决 Bufferbloat 方案或算法**，如果是基于丢包反馈的拥塞控制算法，就会在无法及时第三区间偏离而形成锯齿形波动。

## 3. 使用 BBR 实践

BBR 算法对于大带宽长链路也就是高 BDP 网络环境中，例如跨海网络、尤其是在有轻微丢包的网络条件下，较传统的 cubic 算法，有一定的提升。

简单来讲，BBR 通过应答包（ACK）中的 RTT 信息和已发送字节数来计算 真实传输速率（delivery rate），然后根据后者来调节客户端接下来的发送速率（sending rate），通过保持合理的 inflight 数据量来使传输带宽最大、传输延迟最低。

笔者所进行的实践中，通过对 cubic 和 BBR 进行吞吐量测试，提升了 30% ~ 45% 的传输率。在网上，有其他人验证了使用不同拥塞控制算法、延迟和丢包参数所做的各种 TCP 吞吐量测试的全套测试，证明了在一定的丢包率（1.5%、3%）的情况下 BBR 的出色表现。结果如下图。

<div  align="center">
	<img src="../assets/bbr.png" width = "600"  align=center />
	<p>网络吞吐量 – 各种拥塞控制算法的测试结果 </p>
</div>

