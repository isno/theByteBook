# 3.2 Linux 系统收包流程


这一节，我们通过图 3-1 所示的 Linux ingress 架构，系统地了解网络数据包进入网卡（eth0）后，在 Linux 内核中是被如何处理的。

<div  align="center">
	<img src="../assets/networking.svg" width="650"  align=center />
	<p>图 3-1 Linux ingress 架构概览 </p>
</div>

根据 Linux ingress 架构，总结 Linux 系统收包过程如下：

1. 网卡 eth0 收到数据包。
2. 网卡通过 DMA（Direct Memory Access，直接内存访问）将数据包拷贝到内核 RingBuffer（环形缓冲区），如果 RingBuffer 满了则产生丢包 。
3. 网卡产生 IRQ（Interrupt ReQuest，硬件中断）告知内核有新的数据包达到。
4. 内核收到中断后, 调用相应中断处理函数，开始唤醒 ksoftirqd 内核线程处理软中断。
5. 内核进行软中断处理，调用驱动注册在内核中的 NAPI poll 接口从 Ring Buffer 中获取数据，并生成 skb（Socket Buffer），送至内核协议栈处理。
6. 内核中网络协议栈处理：这里对数据包进行各种逻辑处理，例如 IP 路由、iptables 的处理、数据包的解封/封装、NAT 接口转换、连接跟踪等等。
7. 网络协议栈处理数据后，并将其发送到对应应用的 socket 接收缓冲区。


通过对 Linux 处理网络数据包的过程进行分析，我们可以发现一些潜在的问题。

主要问题在于网络数据包在内核中的处理流程可能过于冗长，导致额外的性能开销。对于大多数常规应用而言，这种开销可能不是主要关注点。然而，在需要处理大规模并发连接的场景，如 C10M（单机1000万个并发连接）的系统，或是构建各类高性能计算集群，内核处理带来的影响就变得不容忽视。

除了想办法优化内核网络协议栈，业界也出现了“绕过内核”这一思想的技术，例如 XDP（eXpress Data Path）、DPDK（Data Plane Development Kit），以及用于跨主机通信的 RDMA（Remote Direct Memory Access）等。在本章内容中，笔者也将陆续介绍这些技术，以及探讨解决 Linux 系统在处理大规模并发连接时面临的挑战。

回过头，我们继续分析 Linux 内核网络框架，看看网络数据包在内核协议栈中是如何被过滤、修改和转发的。