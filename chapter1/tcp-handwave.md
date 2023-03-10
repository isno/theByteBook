# TCP挥手阶段优化

由于TCP双全工的特性，安全地关闭一个连接需要四次挥手。但在一个复杂的网络环境下，存在很多异常情况，异常断开连接会导致产生孤儿连(半连接)。
这种连接既不能发送数据，也无法接收数据，累计过多，会消耗大量系统资源。 在高并发的场景下，孤儿连过多会引起 Address already in use: connect 类似的错误。

该阶段优化的方向策略是调整保守的内核参数，尽快释放资源。

<div  align="center">
	<p>图1:TCP挥手流程</p>
	<img src="/assets/tcp挥手流程.png" width = "500" alt="图片名称" align=center />
</div>

**TCP挥手流程及优化调整**

主动方发送 FIN 报文后，连接就处于 FIN_WAIT_1 状态，正常情况下，如果能及时收到被动方的 ACK，则会很快变为 FIN_WAIT2 状态。但是当迟迟收不到对方返回的 ACK 时，连接就会一直处于 FIN_WAIT1 状态。此时内核会定时重发 FIN 报文，其中重发次数由 tcp_orphan_retries 参数控制。

如果 FIN_WAIT_1 状态连接很多，我们就需要考虑降低 tcp_orphan_retries 的值，当重传次数超过 tcp_orphan_retries 时，连接就会直接关闭掉。

**减小FIN重传次数**

调整FIN包重传次数为5  ，该参数值默认为0，表示重发次数为8；

```
vim /etc/sysctl.conf
net.ipv4.tcp_orphan_retries = 5 
sysctl -p
```

**减小半连接最大数**

tcp_max_orphans参数是系统半连接最大数，当半连接数超过此值时，直接发送 RST 报文强行关闭连接
```
vim /etc/sysctl.conf
net.ipv4.tcp_max_orphans = 32768
sysctl -p

```

**TIME_WAIT相关的优化**

TIME_WAIT 是主动方四次挥手的最后一个状态。当收到被动方发来的 FIN 报文后，主动方回复 ACK,表示确认对方的发送通道已经关闭，进而进入TIME_WAIT 状态 ，等待 2MSL的时间后进行关闭。 2MSL 足以让两个方向上的数据包都被丢弃，使得原来连接的数据包在网络中都自然消失，再出现的数据包一定都是新建立连接所产生的。

TIME_WAIT有两个主要作用：
* 防止具有相同「四元组」（同一ip，同一端口）的旧数据包被收到
* 保证「被动关闭连接」的一方能被正确的关闭，即保证最后的 ACK 能让被动关闭方接收，从而帮助其正常关闭；

虽然 TIME_WAIT 状态有存在的必要，但它毕竟会消耗系统资源。如果发起连接一方的 TIME_WAIT 状态过多，占满了所有端口资源，则会导致无法创建新连接。在高并发的场景中，端口资源不足将会导致TCP新连接无法建立 抛出Address already in use: connect的错误。

查看Linux系统重的端口号范围

```
cat /proc/sys/net/ipv4/ip_local_port_range   32768   60999
```

根据 TCP 连接四元组计算，Client 连接 Server 最多有 28232 可以用，也就是说最多同时有 28232 个连接保持。
如果用短连接的话很快就会出现上面错误，因为每个连接关闭后，需要保持 2 MSL 时间，也就是 1分钟。这意味着 1 分钟内最多建立 28232 个连接，每秒钟 470 个，在网关、内网集群等高并发的场景，要特别注意端口资源耗尽的问题。

** 增大端口范围 **
调整该参数，增大并发连接数。
```
vim /etc/sysctl.conf 
net.ipv4.ip_local_port_range = 1024 65535 
sysctl -p
```

**TIME_WAITE上限调整**

当 TIME_WAIT 的连接数量超过该参数时，新关闭的连接就不再经历 TIME_WAIT 而直接关闭。
当服务器的并发连接增多时，同时处于 TIME_WAIT 状态的连接数量也会变多，此时就应当调大 tcp_max_tw_buckets 参数，减少不同连接间数据错乱的概率。

```
vim /etc/sysctl.conf
net.ipv4.tcp_max_tw_buckets = 32768 
sysctl -p
```



**TIME_WAIT回收及重用**

上面的tcp_max_tw_buckets并不是越大越好，毕竟内存和端口等资源都是有限的，这时候就需要了解tcp_tw_reuse参数，
tcp_tw_reuse 从协议角度理解是安全可控的，可以复用处于 TIME_WAIT 的端口为新的连接所用。（该参数只适用于发起端）

```
vi /etc/sysctl.conf
net.ipv4.tcp_timestamps = 1  // tcp_tw_reuse支持前提
net.ipv4.tcp_tw_reuse = 1   // 默认0，启用将允许TIME-WAIT sockets重新用于新的TCP连接
net.ipv4.tcp_tw_recycle = 1  // 表示开启TCP连接中TIME-WAIT sockets的快速回收
sysctl -p
```

需要注意的是，关于tcp_tw_recycle参数，TCP有一种行为，可以缓存每个连接最新的时间戳，后续请求中如果时间戳小于缓存的时间戳，即视为无效，相应的数据包会被丢弃。

如果在后端有三层四层的NAT设备，某些流量转发在NAT模式下会修改源IP，但并不修改TCP时间戳，这会导致SYN拒绝服务，需要根据实际情况开启关闭此值。




