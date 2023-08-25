# 2.3.1 网络优化配置实践

## 1. 调整 RX 队列数量

如果网卡及其驱动支持 RSS/多队列，可以调整 RX queue（也叫 RX channel）的数量。

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
