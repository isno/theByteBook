# 2.3.2 内核协议栈参数配置实践


## 1. backlog 队列和缓存相关

### net.ipv4.tcp_rmem

本参数中的 rmem(收包缓冲) / wmem(发包缓冲) 即是 socket buffer，也就是 图 2-5 中 kernel recv buffer。

此参数分为三列，表示最低/默认/最大，内核会根据可用内存大小动态进行调整。

- 第一列表示每个 TCP socket 的最小收包缓冲，这个值用于系统内存紧张时保证最低限度的连接建立
- 第二列表示每个 TCP socket 的默认收包缓冲，此数值将会覆盖全局参数 net.core.rmem_default
- 第三列表示每个 TCP socket 最大收包缓冲


需注意上述几个 buffer 不应设置得过大，当上层处理能力遇到瓶颈时，尤其是当 net.core.somaxconn 也设置的较大时可能消耗较多内存、增加收发延迟，而不能带来吞吐量的提高。


### net.core.netdev_max_backlog

netdev backlog 是上图中的 recv_backlog，所有网络协议栈的收包队列，网卡收到的所有报文都在 netdev backlog 队列中等待软中断处理，和中断频率一起影响收包速度从而影响收包带宽，以 netdev_backlog=300, 中断频率=100HZ 为例：

```
 300    *        100             =     30 000
packets     HZ(Timeslice freq)         packets/s
30 000   *       1000             =      30 M
packets     average (Bytes/packet)   throughput Bytes/s
```

如先前所述，可以通过 /proc/net/softnet_stat 的第二列来验证, 如果第二列有计数, 则说明出现过 backlog 不足导致丢包，但有可能这个参数实际驱动没有调用到，分析丢包问题时如果需要调整此参数，需要结合具体驱动实现。

### net.ipv4.tcp_max_syn_backlog & net.ipv4.tcp_syncookies

tcp_max_syn_backlog 是内核保持的未被 ACK 的 SYN 包最大队列长度，超过这个数值后，多余的请求会被丢弃。对于服务器而言默认值不够大（通常为128），高并发服务有必要将netdev_max_backlog和此参数调整到1000以上。


### net.core.somaxconn

somaxconn 是一个 socket 上等待应用程序 accept() 的最大队列长度，默认值通常为128。
在一个 socket 进行 listen(int sockfd, int backlog) 时需要指定 backlog 值作为参数，如果这个 backlog 值大于 somaxconn 的值，最大队列长度将以 somaxconn 为准，多余的连接请求将被放弃，此时客户端可能收到一个 ECONNREFUSED 或忽略此连接并重传。



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