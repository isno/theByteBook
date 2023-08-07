# 内核网络优化

在内核旁路文章内，笔者表述了一个观点：**内核是高负载的瓶颈所在**，在本篇文章内，我们以网卡收发数据流程为例来继续阐述这个问题，并给到相关的内核优化策略。


## 什么是中断？

首先，我们要对中断有个基本的认识。

中断在本质上是软件或者硬件发生了某种情形而通知处理器的行为，处理器进而停止正在运行的指令流，去转去执行预定义的中断处理程序。中断一般分为 IRQ（Interupt ReQuest） 和 softIRQ。

- 硬中断主要是负责耗时短的工作，特点是快速执行
- 软中断由内核处理，通常都是耗时比较长的事情，是一种推后执行的机制。

软件中断也就是通知内核的机制的泛化名称，目的是促使系统切换到内核态去执行异常处理程序。

以网卡收发数据为例，硬中断把网卡的数据读到内存中，然后更新一下硬件寄存器的状态，比如把状态更新为表示数据已经读到内存中的状态值。接着，软中断调用软中断处理程序处理一些比较耗时且复杂的事情，如从内存中找到网络数据，再按照网络协议栈，对网络数据进行逐层解析和处理，最后把数据送给应用程序。



## 中断是高负载的瓶颈

中断的方式存在一个问题，当大流量数据到来时候，网卡会产生大量的中断，内核在处理中断上下文中，会浪费大量资源来处理中断本身。

所以，NAPI 技术被提出来，NAPI 技术先将内核屏蔽，然后每隔一段时间去轮询网卡是否有数据。不过相应的，如果数据量少，轮询本身也会占用大量不必要的 CPU 资源，所以需要进行抉择判断。

- 首先，内核在主内存中为收发数据建立一个环形的缓冲队列（通常也叫 DMA 环形缓冲区）
- 内核将这个缓冲区通过 DMA 映射，把这个队列交给网卡
- 网卡收到数据，将会直接放到这个环形缓冲区，也就是直接放进主内存中了，然后向系统产生一个中断
- 内核收到这个中断，将会取消 DMA 映射，这样内核就直接从主内存中读取了数据

这就形成了我们文章开头的结论：**高负载的网卡是软中断产生的大户，很容易形成瓶颈**。

## 启用网卡多队列

NAPI 技术可以很好地与现在常见的 1 Gbps 网卡配合使用。但是，对于 10Gbps、20Gbps 甚至 40Gbps 的网卡，NAPI 还是不够。

我们要换一个思路，不拘泥于单个 CPU 进行队列处理呢，要知道一直以来都是 CPU0 进行绑定到网卡队列，导致这个核心的负载会异常高。

网卡多队列技术就是适用于高流量的情况。网卡多队列是一种技术手段，可以解决网络 I/O 带宽 QoS（Quality of Service）问题。

网卡多队列驱动将各个队列通过中断绑定到不同的核上，从而解决网络 I/O 带宽升高时单核 CPU 的处理瓶颈，提升网络 PPS 和带宽性能。经测试，在相同的网络 PPS 和网络带宽的条件下，与 1 个队列相比，2 个队列最多可提升性能达 50% 到 100%，4 个队列的性能提升更大。


### 查看与开启多队列

我们找到主网卡，查询配置信息

```
$ ethtool -l eth0  
Channel parameters for eth0:
Pre-set maximums:
RX:		0
TX:		0
Other:		0
Combined:	2  // 表示最多支持设置2个队列
Current hardware settings:
RX:		0
TX:		0
Other:		0
Combined:	1 // 当前生效队列
```

但注意，不是所有网卡驱动都支持这个操作。如果你的网卡不支持，会看到如下类似的错误

```
$ ethtool -l eth0
Channel parameters for eth0:
Cannot get device channel parameters
: Operation not supported
```

设置多队列均匀分布流量。

```
$ ethtool -L eth0 combined 2
```

## 路由、交换机缓冲队列

路由器或者交换机的数据发送依赖于队列（queue），它首先是将数据存储在内存中，如果当前的发送接口不繁忙，那么它将转发数据包，如果当前的接口繁忙，那么网络设备会将数据包暂存于内存中，直到接口空闲才发送数据包，基本的发送原则是 先进先出（FIFO）。

如果使用单一的 FIFO 队列，那么将会缺失一项很重要的功能 - Qos，不能获得优先调度哪些数据转发的能力，FIFO 队列的长度，也是影响 数据的延迟、抖动、丢弃等问题的因素。

- 较长的队列相较于较短的队列，数据被 尾部丢弃 可能性降低，但是延迟和抖动会加大
- 较短的队列相较于较长的队列，数据的 尾部丢弃 可能性会增加，但是延迟和抖动会下降
- 如果产生了持续的拥塞，无论队列是长或者短，数据都会被丢弃

### Ring

要发送数据并不是由 发送队列直接输出到 一个输出接口进行转发，而是将数据包从一个输出队列（通常指示为软件队列，RP Ring）传送到另一个更小的输出队列（通常指示为硬件队列，TX Ring）。 然后再从这个更小的输出队列进行转发。

通常硬件队列的长度很小，而且硬件队列的转发不依赖于通过 CPU 而被关联到每一个物理接口。所以即便是路由器的 CPU 工作负荷很重，硬件队列也可以快速的发送数据，而不需要去等待 CPU 做中断处理的时间延迟。

但是硬件队列永远都是遵守 FIFO 原则，它不像软件队列一样可以使用 Qos 的队列工具来进行管理。

```
$ ethtool -g eth0
Ring parameters for eth0:
Pre-set maximums:
RX:		256
RX Mini:	0
RX Jumbo:	0
TX:		256
Current hardware settings:
RX:		256
RX Mini:	0
RX Jumbo:	0
TX:		256
```

接收和发送的大小都是256字节，这个明显偏小。在遇到burst流量时，可能导致网卡的接收ring buffer满而丢包。
在高性能大流量的服务器或者转发设备上，一般都要配置为2048甚至更高。

## RPS / RFS

对于多队列网卡，针对网卡硬件接收队列与 CPU 核数在数量上不匹配导致报文在 CPU 之间分配不均这个问题，Google 的工程师提供的 RPS / RFS 两个补丁，它们运行在单队列网卡，可以在软件层面将报文平均分配到多个 CPU 上。

RPS （Receive Package Steering）帮助单队列网卡将其产生的SoftIRQ分派到多个CPU内核进行处理，网卡驱动通过四元组（源 ip、源端口、目的 ip 和目的端口）生成一个hash值，然后根据这个hash值分配到对应的CPU上处理，从而发挥多核的能力，有效的避免处理瓶颈。

在使用RPS接收数据包之后，会在指定的CPU进行软中断处理，之后就会在用户态进行处理；如果用户态处理的CPU不在软中断处理的CPU，则会造成CPU cache miss，造成很大的性能影响。RFS能够保证处理软中断和处理应用程序是同一个CPU，这样会保证local cache hit，提升处理效率。RFS需要和RPS一起配合使用。

不支持网卡多队列技术

```
$ ethtool -l eth0
Channel parameters for eth0:
Pre-set maximums:
RX:		0
TX:		0
Other:		0
Combined:	1
Current hardware settings:
RX:		0
TX:		0
Other:		0
Combined:	1
```

对于一个多队列系统，如果配置了 RSS，则硬件接收队列会映射到每个CPU上，此时 RPS 可能会冗余。但如果硬件队列的数目少于CPU，设置 rps_cpus 为每个队列指定的CPU与中断该队列的CPU共享相同的内存域时，则 RPS 可能是有用的

```
$ cat /sys/class/net/eth0/queues/rx-0/rps_cpus 
0  // 当上述值为0时(默认为0)，不会启用RPS。
```

如果要使用CPU 1~2，则位图为0 0 0 0 0 0 1 1，即0x3，将 3 写入rps_cpus 即可，后续rx-0将会使用CPU 1~2 来接收报文。

```
echo 3 > /sys/class/net/eth0/queues/rx-0/rps_cpus
```

期间，我们开启另外一个终端进行测试，注意观察 idle 字段，越低代表 CPU 负载越低（空闲）

**先开启接收客户端**
```
$ netserver
Starting netserver with host 'IN(6)ADDR_ANY' port '3030' and family AF_UNSPEC
```

```
$ netperf -H 192.168.28.152 -l 60 -- -m 1024 
MIGRATED TCP STREAM TEST from 0.0.0.0 (0.0.0.0) port 0 AF_INET to 192.168.28.152 () port 0 AF_INET
Recv   Send    Send                          
Socket Socket  Message  Elapsed              
Size   Size    Size     Time     Throughput  
bytes  bytes   bytes    secs.    10^6bits/sec  

 87380  16384   1024    60.00     272.80 

```


```
$ mpstat  -P ALL 5
Linux 3.10.0-1160.el7.x86_64 (MiWiFi-RB03-srv) 	2023年05月14日 	_x86_64_	(2 CPU)

16时22分04秒  CPU    %usr   %nice    %sys %iowait    %irq   %soft  %steal  %guest  %gnice   %idle
16时22分09秒  all    1.38    0.00    2.34    0.00    0.00    1.38   28.37    0.00    0.00   66.52
16时22分09秒    0    1.10    0.00    2.42    0.00    0.00    0.22   22.47    0.00    0.00   73.79
16时22分09秒    1    1.44    0.00    2.46    0.00    0.00    2.67   33.88    0.00    0.00   59.55

```
**开启 RPS 后，负载压到了 0-1 号核心上**

这里吞吐没有提升的原因，是因为单队列已经到达内存读写的极限了（本地压测），我们只需要关注 CPU 负载被分摊的现象即可

```
$ netperf -H 192.168.28.152 -l 60 -- -m 1024 
MIGRATED TCP STREAM TEST from 0.0.0.0 (0.0.0.0) port 0 AF_INET to 192.168.28.152 () port 0 AF_INET
Recv   Send    Send                          
Socket Socket  Message  Elapsed              
Size   Size    Size     Time     Throughput  
bytes  bytes   bytes    secs.    10^6bits/sec  

 87380  16384   1024    60.00     273.81 

```
```
$ mpstat  -P ALL 5
Linux 3.10.0-1160.el7.x86_64 (MiWiFi-RB03-srv) 	2023年05月14日 	_x86_64_	(2 CPU)

16时32分29秒  CPU    %usr   %nice    %sys %iowait    %irq   %soft  %steal  %guest  %gnice   %idle
16时32分34秒  all    3.15    0.00    2.93    0.00    0.00    1.30   26.38    0.00    0.00   66.23
16时32分34秒    0    3.54    0.00    3.98    0.00    0.00    0.00   24.12    0.00    0.00   68.36
16时32分34秒    1    2.78    0.00    1.93    0.00    0.00    2.57   28.48    0.00    0.00   64.24
```


