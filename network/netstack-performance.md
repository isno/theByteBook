# 2.3.2 内核协议栈优化指南


对于一个传输少量数据的TCP短连接，对于整个过程，握手阶段将近占用了50%的资源消耗，另外在一个高并发的服务场景，如负载均衡、数据库等，针对性的去优化较为保守内核参数很有必要。


<div  align="center">
	<img src="../assets/TCP.svg" width = "550"  align=center />
	<p>图 2-3 TCP 握手概览</p>
</div>


- tcp_max_syn_backlog 是内核保持的未被 ACK 的 SYN 包最大队列长度，超过这个数值后，多余的请求会被丢弃。
- net.core.somaxconn somaxconn 是一个 socket 上等待应用程序 accept() 的最大队列长度，默认值通常为128。
在一个 socket 进行 listen(int sockfd, int backlog) 时需要指定 backlog 值作为参数，如果这个 backlog 值大于 somaxconn 的值，最大队列长度将以 somaxconn 为准，多余的连接请求将被放弃。


## TIME_WAIE 相关

TIME_WAIT 是 TCP 挥手的最后一个状态。当收到被动方发来的 FIN 报文后，主动方回复 ACK，表示确认对方的发送通道已经关闭，进而进入TIME_WAIT 状态 ，等待 2MSL 的时间后进行关闭。

如果发起连接一方的 TIME_WAIT 状态过多，占满了所有端口资源，则会导致无法创建新连接。在高并发的场景中，端口资源不足将会导致 TCP 新连接无法建立 抛出Address already in use: connect 的错误。TIME_WAIT 的问题在反向代理中比较明显，例如 nginx 默认行为下会对于 client 传来的每一个 request 都向 upstream server 打开一个新连接，高 QPS 的反向代理将会快速积累 TIME_WAIT 状态的 socket，直到没有可用的本地端口，无法继续向 upstream 打开连接，此时服务将不可用。


### TIME_WAITE上限调整

当 TIME_WAIT 的连接数量超过该参数时，新关闭的连接就不再经历 TIME_WAIT 而直接关闭。 当服务器的并发连接增多时，同时处于 TIME_WAIT 状态的连接数量也会变多，此时就应当调大 tcp_max_tw_buckets 参数，减少不同连接间数据错乱的概率。

### 增大端口范围

TCP 建立连接时 client 会随机从 net.ipv4.ip_local_port_range 定义的端口范围中选择一个作为源端口。

此参数默认值通常为 32768 60999，由于 TCP/IP 协议中低于1024的端口号被保留作为熟知端口监听使用，因此最小临时端口必须大于1024（推荐大于4096），最大临时端口可以为 TCP/IP 最大端口号 65535。


## 参考配置

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