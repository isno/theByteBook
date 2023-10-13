# 3.2.1 快速数据路径 XDP

## 1. XDP 出现的背景

由于 Linux 内核协议栈（TCP/IP Stack）更加注重通用性，所以在网络性能需求场景中存在一定的瓶颈，随着 100G、200/400G 高速率网卡的出现，这种性能瓶颈就变得无法接受了。

2010 年，由 Intel 领导的 DPDK 实现了一个内核旁路（Bypass Kernel）思想的高性能网络应用开发解决方案，并逐渐成为了独树一帜的成熟技术体系。但是 DPDK 也由于内核旁路这一前提，使其天然就无法与内核技术生态很好的结合。2016 年，在 Linux Netdev 会议上，David S. Miller 喊出了 “DPDK is not Linux” 的口号。同年，伴随着 eBPF 技术的成熟，Linux 内核终于迎来了属于自己的高速公路 —— XDP（AF_XDP），其具有足以媲美 DPDK 的性能以及背靠内核的多种独特优势。

## 2. XDP 概述

XDP（eXpress Data Path，快速数据路径）是 Linux 内核 v4.8 版本起中提供高性能、可编程的网络数据包处理框架，本质上是 Linux 内核网络模块中的一个 BPF Hook，能够动态挂载 eBPF 程序逻辑，使得 Linux 内核能够在数据报文到达 L2（网卡驱动层）时就对其进行针对性高速处理处理，无需再`循规蹈矩`地进入到内核网络协议栈。

更详细地说，AF_XDP 是一种内核协议族（Address Family），可指定的 Socket 通讯类型。上层应用程序可以通过 AF_XDP Socket 这一系统调用与 XDP 进行交互，从而完成特定的动作控制。

例如，通过 XDP BPF 程序的 Redirect（重定向）处理，可以将报文重定向到一块指定的用户态可读写的内存队列（UMEM）中，使得用户态程序可以直接使用 AF_XDP socket 去接收/发送数据（直接访问这块内存的报文内容）。

<div  align="center">
	<img src="../assets/XDP.svg" width = "500"  align=center />
	<p>图 2-20</p>
</div>

又例如 XDP 程序可以通过动作码（XDP action code）来指定驱动程序对报文的后续处理工作：

- XDP_DROP 丢弃数据包。
- XDP_REDIRECT 将数据包重定向其他网络接口（包括虚拟网卡），或者结合 AF_XDP Socket 重定向用户态程序。
- XDP_PASS 放行数据包，数据包进入常规的内核网络协议栈。
- XDP_TX XDP 程序的一个高效选型，能够在收到数据包的网络接口上直接将数据包再发送出去。


## 3. XDP 应用示例

本书在 2.1.2 小节讲过连接跟踪机制，连接跟踪独立于 netfilter，netfilter 只是 Linux 内核中的一种连接跟踪实现。换句话说，只要具备了 hook 能力，能拦截到进出主机的每个数据包，就完全可以在此基础上实现另外一套连接跟踪。

<div  align="center">
	<img src="../assets/cilium.svg" width = "500"  align=center />
	<p>图 2-21</p>
</div>

云原生网络方案 Cilium 在 1.7.4+ 版本就实现了这样一套独立的连接跟踪和 NAT 机制。其基本原理是：

- 基于 BPF hook 实现数据包的拦截功能（等价于 netfilter 的 hook 机制）
- 在 BPF hook 的基础上，实现一套全新的 conntrack 和 NAT

因此使用 Cilium 方案的 Kubernetes 网络模型，即便在 Node 节点卸载 netfilter ，也不会影响 Cilium 对 Kubernetes ClusterIP、NodePort、ExternalIPs 和 LoadBalancer 等功能的支持。

由于 Cilium 方案的连接跟踪机制独立于 netfilter ，因此它的 conntrack 和 NAT 信息也没有存储在内核中的 conntrack table 和 NAT table 中，常规的 conntrack/netstats/ss/lsof 等工具看不到 nat、conntrack 数据，所以需要另外使用 Cilium 的命令查询，例如：

```plain
$ cilium bpf nat list
$ cilium bpf ct list global
```
