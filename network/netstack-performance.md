# 3.3.2 内核协议栈优化

在一个传输少量数据的 TCP 短连接的生命周期中，握手、挥手阶段将近占用了 70% 的资源消耗。在一个高并发场景中，针对性地优化较为保守内核参数是提升服务处理能力的必要手段。在本文中，我们介绍内核协议栈中 TCP 握手流程中队列、挥手 TIME_WAITE、Keepalive 保活机制以及拥塞控制等流程及参数设置。

## 1. TCP 握手流程

如图 2-6 所示，握手流程中有两个队列较为关键，当队列满时多余的连接将会被丢弃。

<div  align="center">
	<img src="../assets/TCP.svg" width = "550"  align=center />
	<p>图 2-6 TCP 握手概览</p>
</div>

- SYN Queue 被称为半连接队列，是内核保持的未被 ACK 的 SYN 包最大队列长度，通过内核参数 net.ipv4.tcp_max_syn_backlog 配置，高并发的环境下建议设置为 1024 或更高。
- Accept Queue 被称为全连接队列，是一个 socket 上等待应用程序 accept 的最大队列长度，取值为 min(backlog，net.core.somaxconn)。

backlog 为创建 TCP 连接时设置，如下代码。
```plain
int listen(int sockfd, int backlog)
```

## 2. TCP 连接保活

TCP 建立连接后会有个发送一个空 ACK 的探测行为来保持连接（keepalive）。keepalive 保活受以下参数影响。

- net.ipv4.tcp_keepalive_time 最大闲置时间
- net.ipv4.tcp_keepalive_intvl 发送探测包的时间间隔
- net.ipv4.tcp_keepalive_probes 最大失败次数，超过此值后将通知应用层连接失效

在大规模的集群内部，如果 keepalive_time 设置较短且发送较为频繁，会产生大量的空 ACK 报文，存在塞满 RingBuffer 造成 TCP 丢包甚至连接断开问题。可以适当调整 keepalive 范围以减小空报文 burst 风险。

## 3. TCP 连接断开

由于 TCP 双全工的特性，安全关闭一个连接需要四次挥手，如图 2-7 示例。但在一个复杂的网络环境下，会存在很多异常情况，异常断开连接会导致产生孤儿连(半连接)，这种连接既不能发送数据，也无法接收数据，累计过多，会消耗大量系统资源，资源不足时会产生 Address already in use: connect 类似的错误。

<div  align="center">
	<img src="../assets/tcp_disconnect.svg" width = "550"  align=center />
	<p>图 2-7 TCP 挥手概览</p>
</div>

挥手流程中的主要优化为 TIME_WAIT 参数调整。TIME_WAIT 是 TCP 挥手的最后一个状态，当收到被动方发来的 FIN 报文后，主动方回复 ACK，表示确认对方的发送通道已经关闭，继而进入 TIME_WAIT 状态 ，等待 2MSL 时间后关闭连接。

如果发起连接一方的 TIME_WAIT 状态过多，会占满了所有端口资源，则会导致无法创建新连接，可以尝试调整以下参数减小 TIME_WAIT 影响。

- net.ipv4.tcp_max_tw_buckets，此数值定义系统在同一时间最多能有多少 TIME_WAIT 状态，当超过这个值时，系统会直接删掉这个 socket 而不会留下 TIME_WAIT 的状态
- net.ipv4.ip_local_port_range，TCP 建立连接时 client 会随机从该参数中定义的端口范围中选择一个作为源端口。可以调整该参数增大可选择的端口范围。

TIME_WAIT 的问题在反向代理中比较明显，例如 Nginx 默认行为下会对于 client 传来的每一个 request 都向 upstream server 打开一个新连接，高 QPS 的 Nginx 将会快速积累 TIME_WAIT 状态的 socket，直到没有可用的本地端口，无法继续向 upstream 打开连接，此时服务将不可用。

## 4. 相关配置参考

笔者整理了部分内核参数配置，以供读者参考。但注意使用场景不同和机器配置不同，相关的配置起到的作用也不尽相同，生产环境中的参数调优，得在知晓原理基础上，根据实际情况进行调整。

```plain
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