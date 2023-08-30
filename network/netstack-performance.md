# 2.3.2 内核协议栈优化指南

一个传输少量数据的 TCP 短连接的生命周期中，握手、挥手阶段将近占用了 70% 的资源消耗，在一个高并发的服务场景，如负载均衡、数据库等，针对性的去优化较为保守内核参数提提升服务性能的必要手段。在本文中，内核协议栈参数优化方向为 TCP 握手流程中队列大小、挥手 TIME_WAITE、keepalive 保活机制以及拥塞控制。

<div  align="center">
	<img src="../assets/TCP.svg" width = "550"  align=center />
	<p>图 2-3 TCP 握手概览</p>
</div>

## 1. TCP 握手流程参数优化

握手流程中有两个队列较为关键，当队列满时，多余的连接将会被丢弃。

- SYN Queue 也被称为半连接队列，是内核保持的未被 ACK 的 SYN 包最大队列长度，通过内核参数 net.ipv4.tcp_max_syn_backlog 配置，高并发的环境下建议设置为 1024 或更高。
- Accept Queue 也被称为全连接队列， 是一个 socket 上等待应用程序 accept 的最大队列长度。取值为 min(backlog，net.core.somaxconn)。

## 2. TCP 连接保活参数优化

当 TCP 建立连接后，会有个发送一个空的 ACK 的探测行为来保持连接（keepalive）。keepalive 受以下参数影响：

- net.ipv4.tcp_keepalive_time 最大闲置时间
- net.ipv4.tcp_keepalive_intvl 发送探测包的时间间隔
- net.ipv4.tcp_keepalive_probes 最大失败次数，超过此值后将通知应用层连接失效

在大规模的集群内部，如果 keepalive_time 设置较短且发送较为频繁，会产生大量的空 ACK 报文，存在塞满 RingBuffer 造成 TCP 丢包甚至连接断开问题。

## 3. TCP 连接断开参数优化

由于 TCP 双全工的特性，安全关闭一个连接需要四次挥手。但在一个复杂的网络环境下，会存在很多异常情况，异常断开连接会导致产生孤儿连(半连接)。 这种连接既不能发送数据，也无法接收数据，累计过多，会消耗大量系统资源。在高并发的场景下，孤儿连过多会引起资源不足，产生 Address already in use: connect 类似的错误。

<div  align="center">
	<img src="../assets/tcp_disconnect.svg" width = "550"  align=center />
	<p>图 2-3 TCP 挥手概览</p>
</div>

挥手流程中的主要优化为 TIME_WAIT 的参数调整。TIME_WAIT 是 TCP 挥手的最后一个状态。当收到被动方发来的 FIN 报文后，主动方回复 ACK，表示确认对方的发送通道已经关闭，继而进入TIME_WAIT 状态 ，等待 2MSL 时间后关闭连接。

如果发起连接一方的 TIME_WAIT 状态过多，会占满了所有端口资源，则会导致无法创建新连接。TIME_WAIT 的问题在反向代理中比较明显，例如 nginx 默认行为下会对于 client 传来的每一个 request 都向 upstream server 打开一个新连接，高 QPS 的反向代理将会快速积累 TIME_WAIT 状态的 socket，直到没有可用的本地端口，无法继续向 upstream 打开连接，此时服务将不可用。

- net.ipv4.tcp_max_tw_buckets，此数值定义系统在同一时间最多能有多少 TIME_WAIT 状态，当超过这个值时，系统会直接删掉这个 socket 而不会留下 TIME_WAIT 的状态
- net.ipv4.ip_local_port_range，TCP 建立连接时 client 会随机从该参数中定义的端口范围中选择一个作为源端口。可以调整该参数范围增大可选择的端口范围。

## 4. 相关配置参考

笔者整理了部分内核参数配置，以供读者参考。但需注意，根据使用场景不同和机器配置不同，相关的配置起到的作用也不尽相同，生产环境中的参数调优，需要在理解原理的基础上，根据实际情况进行调整。

```
net.ipv4.tcp_tw_recycle = 0
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_rmem = 16384 262144 8388608
net.ipv4.tcp_wmem = 32768 524288 16777216
net.core.somaxconn = 8192
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.wmem_default = 2097152
net.ipv4.tcp_max_tw_buckets = 5000
net.ipv4.tcp_max_syn_backlog = 10240
net.core.netdev_max_backlog = 10240
net.netfilter.nf_conntrack_max = 1000000
net.ipv4.netfilter.ip_conntrack_tcp_timeout_established = 7200
net.core.default_qdisc = fq_codel
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_slow_start_after_idle = 0
```