# 2.3 Linux 收包流程以及内核参数优化指南

<div  align="center">
	<img src="../assets/networking.svg" width="550"  align=center />
	<p>图 Linux 收包流程 </p>
</div>

Linux 收包流程概览：

1. 网卡收到包
2. 网卡通过 DMA (Direct Memory Access，直接存储器访问) 将数据包从网卡拷贝到内存的环形缓冲区(ring buffer)
3. 数据从网卡拷贝到内存后, 网卡产生硬件中断 IRQ（Interupt ReQuest）告知内核有新的数据包达到
4. 内核收到中断后, 调用相应中断处理函数，唤醒 ksoftirqd
5. 内核进行软中断处理，调用 NAPI poll 接口来获取内存环形缓冲区(ring buffer)的数据包，并以 skb 的形式送至更上层处理
6. 协议栈：L2 处理
7. 协议栈：L3 处理
8. 协议栈：L4 处理
9. 网络协议栈处理数据后，并将其发送到对应应用的 socket 接收缓冲区

如果内核支持数据包定向分发(packet steering)或者 NIC 本身支持多个接收队列的话, 从网卡过来的数据会在不同的 CPU 之间进行均衡, 这样可以获得更高的网络速率。