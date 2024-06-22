# 3.2 Linux 系统收包流程

客户端发起请求，先通过 DNS 获得目的地 IP，然后封装成 HTTP 协议，数据包经过路由，还有拥塞控制，最终到达目的地网卡（eth0），并进入 Linux 内核。

这一节，我们根据图 3-1 所示的 Linux ingress 架构，了解数据包在 Linux 内核中是被如何处理的。

<div  align="center">
	<img src="../assets/networking.svg" width="650"  align=center />
	<p>图 3-1 Linux ingress 架构概览 </p>
</div>

根据 Linux ingress 架构，总结 Linux 系统收包过程如下：

1. 网卡 eth0 收到数据包。
2. 网卡通过 DMA（Direct Memory Access，直接内存访问）将数据包拷贝到内核 Ring Buffer（环形缓冲区），如果 Ring Buffer 满了则产生丢包 。
3. 网卡产生 IRQ（Interrupt ReQuest，硬件中断）告知内核有新的数据包达到。
4. 内核收到中断后, 调用相应中断处理函数，开始唤醒 ksoftirqd 内核线程处理软中断。
5. 内核进行软中断处理，调用驱动注册在内核中的 NAPI poll 接口从 Ring Buffer 中获取数据，并生成 skb（Socket Buffer），送至内核协议栈处理。
6. 内核中网络协议栈：L3（Network Layer）处理。
7. 内核中传输层协议栈：L4（Transport Layer）处理。
8. 网络协议栈处理数据后，并将其发送到对应应用的 socket 接收缓冲区。

如以上的过程所示，设计一个 C10M（Millions of concurrent Connections，单机 1000 万并发）[^1]的系统或者组建一个高性能计算集群，那就不能忽略 Linux 内核带来的各种影响，这些影响包括用户进程调用系统进入内核态的开销，响应数据包时产生的硬中断开销，以及 ksoftirqd 处理软中断而产生的上下文开销等等。


下一节，我们将继续深入 Linux 内核网络框架，了解数据包在内核协议栈中是如何被过滤、修改和转发的。

[^1]: 参见 http://c10m.robertgraham.com/p/manifesto.html