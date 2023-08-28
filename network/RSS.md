# 2.3.1 多 CPU 下的 Ring Buffer 处理

一些默认的系统采用的是一个 CPU 处理 Ring Buffer 数据，从 图 2-5 得知，处理一个数据包会有各类的中断、softirq 等处理，因为分配给 Ring Buffer 的空间是有限的，当收到的数据包速率大于单个 CPU 处理速度的时，Ring Buffer 可能被占满并导致新数据包被自动丢弃。

一个 CPU 去处理 Ring Buffer 数据会很低效。这个时候就产生 RRS、RPS 等机制来提升内核网络包的处理能力，从而提升 PPS，降低 RT。

- RSS（receive side steering）：利用网卡多队列特性，将每个核分别跟网卡的一个首发队列绑定，以达到网卡硬中断和软中断均衡的负载在各个 CPU 中，RPS 要求网卡必须要支持多队列特性。
- RPS(receive packet steering)：RPS 可以把收到的数据包依据一定的 hash 规则给到不同的 CPU，以达到各个 CPU 负载均衡的目的，不过 RPS 只是把软中断做负载均衡，不改变硬中断，因此对网卡没有任何要求。
- RFS（receive flow steering）：RFS 需要依赖于 RPS，他跟 RPS 不同的是不再简单的依据数据包来做 hash，而是根据 flow 的特性，即 application 在哪个核上来运行去做 hash，从而使得有更好的数据局部性。


如果业务属于 CPU 密集型，开启 RPS 等特性，会挤压业务代码的执行时间，从而导致业务性能下降，是否开启多核处理，需要根据业务场景考虑。


## 1. RSS 配置

如果支持 RSS 的话，NIC 会为每个队列分配一个 IRQ，你可以通过配置 IRQ affinity 指定 IRQ 由哪个 CPU 来处理中断。先通过 /proc/interrupts 找到 IRQ 号之后，将希望绑定的 CPU 号写入 /proc/irq/IRQ_NUMBER/smp_affinity（写入的内容为 16 进制的 bit mask）。

例如，我们看到队列 rx_0 对应的中断号是 41，则执行：

```
echo 6 > /proc/irq/41/smp_affinity  // 6 表示的是 CPU2 和 CPU1
```

0 号 CPU 的掩码是 0x1 (0001)，1 号 CPU 掩码是 0x2 (0010)，2 号 CPU 掩码是 0x4 (0100)，3 号 CPU 掩码是 0x8 (1000) 依此类推。

## 2. RPS 配置

如果网卡不支持 RSS，这时候可以尝试使用 RPS（Receive Packet Steering）。RPS 在网卡不支持 RSS 的情况下使用软件实现 RSS 类似功能的机制，其好处是对网卡没有要求，任何网卡都能支持 RPS。

RPS 相对于 RSS 的缺点是 NIC 收到数据后 DMA 将数据存入的还是一个 Ring Buffer，网卡触发 IRQ 还是发到一个 CPU，RPS 在单个 CPU 将数据从 Ring Buffer 取出来之后才开始起作用，它会为每个数据包计算 Hash 之后发到对应 CPU 的 backlog 中，并通过 Inter-processor Interrupt(IPI) 告知目标 CPU 来处理 backlog。后续 Packet 的处理流程就由这个目标 CPU 来完成，从而实现将负载分到多个 CPU 的目的。

RPS 默认是关闭的，当机器有多个 CPU 并且通过 softirqs 的统计 /proc/softirqs 发现 NET_RX 在 CPU 上分布不均匀或者发现网卡不支持 mutiqueue 时，就可以考虑开启 RPS。

开启 RPS 需要调整 /sys/class/net/DEVICE_NAME/queues/QUEUE/rps_cpus 的值。比如执行:

```
echo f > /sys/class/net/eth0/queues/rx-0/rps_cpus
```

表示的含义是处理网卡 eth0 的 rx-0 队列的 CPU 数设置为 f 。即设置有 15 个 CPU 来处理 rx-0 这个队列的数据，如果你的 CPU 数没有这么多就会默认使用所有 CPU 。

## 3. RFS 配置

RPS 将收到的数据包发配到不同的 CPU 以实现负载均衡，但是可能同一个 Flow 的数据包正在被 CPU1 处理，但下一个数据包被发到 CPU2，会降低 CPU cache hit 比率，这时候可以开启 Receive Flow Steering(RFS) 机制。RFS 一般和 RPS 配合使用，保证同一个 flow 的数据包都会被路由到正在处理当前 Flow 数据的 CPU，从而提高 CPU cache hit 比率。

RFS 默认是关闭的，必须主动配置才能生效。正常来说开启了 RPS 都要再开启 RFS，以获取更好的性能。

配置 rps_sock_flow_entries

```
sysctl -w net.core.rps_sock_flow_entries=32768
```

配置 rps_flow_cnt

```
echo 2048 > /sys/class/net/eth0/queues/rx-0/rps_flow_cnt
```