#TCP传输参数优化：init_cwnd


TCP中有个cwnd的概念，即未经ACK确认可存在网络中的数据量。现如今网络中出现了越来越多的高速和长距离链路，链路的特点时延带宽积很大，这些链路所能容忍的总数据量也很大。通过调整cwnd值，则可以利用这些链路带宽。


cwnd的初始值取决于MSS的大小，计算方法如下

```
min(4 * MSS, max(2 * MSS, 4380))
```
以太网标准的MSS大小通常是1460，cwnd的初始值是3MSS。

在业务应用中的举例：

一个HTTP接口的数据量在20KB左右，约等于15MSS，在一个TCP连接中，这需要3个RTT才能传输完成，如果调整cwnd的初始值为15MSS，则一次RTT即可传输完成，效率提升很大。

<div  align="center">
	<p>图1: init cwnd 效果对比</p>
	<img src="/assets/tcp-cwnd.png" width = "400"  align=center />
</div>

测试不同地区访问14KB的一个文件，很明显initcwnd初始值在10~20之间，比默认有50%性能提升。

设置initcwnd为10MSS
```
shell> ip route | while read r; do
           ip route change $r initcwnd 10;
       done
```

需要注意未经ACK确认的网络数据量为 min(rwnd,cwnd), 接收方的rwnd比较小的话，会阻碍 cwnd 发挥.

**调整合适的rwnd**

接收窗口rwnd的不合理会造成带宽无法合理利用，明明是千兆网络，可实际的传输高峰总差距太远。rwnd合理值取决于BDP的大小, 假设带宽是 100Mbps，延迟是 100ms，那么计算如下
```
BDP = 100Mbps * 100ms = (100 / 8) * (100 / 1000) = 1.25MB
```
如果想最大限度提升吞度量, 充分利用带宽，rwnd大小可以设置为 2*BDP。这是因为发送一次数据最后一个字节刚到时，对端要回ACK才能继续发送，就需要等待一次单向时延的时间，所以当是2倍时，刚好就能在等ACK的时间继续发送数据，等收到ACK时数据刚好发送完成，这样就最大程度利用带宽。

Linux中通过配置内核参数里接收缓冲的大小，进而可以控制接收窗口的大小：
```
cat /proc/sys/net/ipv4/tcp_rmem
net.ipv4.tcp_rmem = <MIN> <DEFAULT> <MAX>
```

调整TCP内核接收窗口大小

```
sysctl net.ipv4.tcp_rmem =  4096	65535	6291456

```

