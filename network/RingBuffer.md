# 2.3.2 Ring Buffer 的监控与配置


## 收到数据包统计

```
$ ethtool -S eth0

NIC statistics:
     rx_packets: 792819304215
     tx_packets: 778772164692
     rx_bytes: 172322607593396
     tx_bytes: 201132602650411
     rx_broadcast: 15118616
     tx_broadcast: 2755615
     rx_multicast: 0
     tx_multicast: 10

```

RX 就是收到数据，TX 是发出数据。还会展示 NIC 每个队列收发消息情况。其中比较关键的是带有 drop 字样的统计和 fifo_errors 的统计 :

```
tx_dropped: 0
rx_queue_0_drops: 93
rx_queue_1_drops: 874
....
rx_fifo_errors: 2142
tx_fifo_errors: 0
```

看到发送队列和接收队列 drop 的数据包数量显示在这里。并且所有 queue_drops 加起来等于 rx_fifo_errors。所以总体上能通过 rx_fifo_errors 看到 Ring Buffer 上是否有丢包

如果有的话一方面是看是否需要调整一下每个队列数据的分配，或者是否要加大 Ring Buffer 的大小。


## 1. 调整 RX 队列数量

```
$ sudo ethtool -l eth0
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
Combined:	8
```

可以看到硬件最多支持 8 个，当前也用满了 8 个。如果 RX 队列没有用满，使用 ethtool -L 可以修改 RX queue 数量。（注意：对于大部分驱动，修改以上配置会使网卡先 down 再 up，因此会造成丢包！）

修改 RX queue 数量为 8 
```
$ sudo ethtool -L eth0 rx 8
```

## 2. 调整 Ring Buffer 队列大小

查看当前 Ring Buffer 大小：

```
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

看到 RX 和 TX 最大是 1024，当前值为 512。队列越大丢包的可能越小，但数据延迟会增加

设置 RX 队列大小：

```
ethtool -G eth0 rx 4096
```

## softirq 数统计

通过 /proc/softirqs 能看到每个 CPU 上 softirq 数量统计：

```
$ cat /proc/softirqs

                    CPU0       CPU1       
          HI:          0          1
       TIMER:  561220291  425834649
      NET_TX:          0          0
      NET_RX:  449607928   16221647
       BLOCK:  241932708          0
BLOCK_IOPOLL:          0          0
     TASKLET:          0         16
       SCHED:  667318083  585701206
     HRTIMER:          0          0
         RCU: 2812907054 2746907460
```

看到 NET_RX 就是收消息时候触发的 softirq，一般看这个统计是为了看看 softirq 在每个 CPU 上分布是否均匀，不均匀的话可能就需要做一些调整。比如上面看到 CPU0 和 CPU1 两个差距很大，原因是这个机器的 NIC 不支持 RSS，没有多个 Ring Buffer。开启 RPS 后就均匀多。

## IRQ 统计
/proc/interrupts 能看到每个 CPU 的 IRQ 统计。一般就是看看 NIC 有没有支持 multiqueue 以及 NAPI 的 IRQ 合并机制是否生效。看看 IRQ 是不是增长的很快。
