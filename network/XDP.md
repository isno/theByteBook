# 3.4.2 eBPF 和 快速数据路径 XDP 

由于 DPDK 完全基于“内核旁路”的思想，它天然无法与 Linux 内核生态很好地结合。

2016 年，在 Linux Netdev 会议上，David S. Miller[^1] 喊出了“DPDK is not Linux”的口号。同年，随着 eBPF 技术的成熟，Linux 内核终于迎来了属于自己的高速公路——XDP（eXpress Data Path，快速数据路径）。XDP 具有媲美 DPDK 的性能，并且背靠 Linux 内核，具备无需第三方代码库和许可、无需专用 CPU 等多种独特优势。

## 1. eBPF 技术简介

DPDK 技术是完全绕过内核，直接将数据包传递到用户空间进行处理。而 XDP 则正好相反，它选择在内核空间中执行我们定义的程序来处理数据包。

那么，如何在内核中执行用户空间定义的程序呢？这就需要用到 BPF（Berkeley Packet Filter，伯克利包过滤器）技术——一种允许在内核空间运行经过安全验证的代码的机制。

自 Linux 内核版本 2.5 起，Linux 系统就开始在支持 BPF 技术了，但早期的 BPF 主要用于网络数据包的捕获和过滤。到了 Linux 内核 3.18 版本，开发者推出了一套全新的 BPF 架构，也就是我们今天所说的 eBPF（Extended Berkeley Packet Filter）。与早期的 BPF 相比，eBPF 的功能不再局限于网络分析，它几乎可以访问 Linux 内核所有关联的资源（因为有了无处不在的钩子），并逐渐发展成为一个多功能的通用执行引擎。

:::center
  ![](../assets/ebpf-go.webp)<br/>
 图 3-13 eBPF 的技术架构
:::

上图展示了一个程序是如何被加载、验证并执行的。具体来看，经历了如下步骤：
- 第一步：编写的c eBPF 程序，经过编译器，编译为 eBPF 字节码。
- 第二步：编译好的代码，会被 eBPF 所对应的高级语言库程序加载，并由高级语言进行系统调用处理。目前 eBPF 支持 golang、python、c/c++、rust 等。
- 第三步：通过系统调用陷入内核后，首先由内核 eBPF 程序进行验证（verify），这一步确保：程序本身无误，不会崩溃、不会出现死循环；没有权限异常；然后进行将编译为 eBPF 伪代码的程序再转换为具体的机器指令集，以优化程序执行，并最终挂载到对应的 hook 点或追踪点。
- 第四步：内核在处理某个追踪点时，刚好有 eBPF，就会触发事件，并由加载的 eBPF 程序处理


其实，不难发现。Linux 系统通过钩子触发 eBPF 程序。

- TC（Traffic Control）钩子：用于在 Linux Traffic Control 系统中执行数据包的过滤和处理。
- XDP 钩子：直接在网络驱动程序层处理数据包，可以实现非常高性能的网络数据包处理。
- LSM（Linux Security Modules）钩子：与 SELinux、AppArmor 等安全模块集成，用于增强系统安全性
- File Operations 钩子：用于监控和修改文件操作，如打开、读取、写入、关闭等。
- ...。


正是由于这些突出的特性，eBPF 可以附加到各种内核子系统，包括网络、跟踪和 Linux 安全模块（LSM）。比如 Facebook 开源的高性能网络负载均衡器 Katran、Isovalent 开源的容器网络方案 Cilium，以及著名的内核跟踪排错工具 BCC 和 bpftrace 等。


## 2. XDP 实际是加载 eBPF 程序的钩子

XDP 本质是 Linux 系统在数据包路径上埋下的钩子，XDP 钩子位于网卡驱动层内，也就是数据包进入网络协议栈之前。对传入的数据包进行任意修改和快速决策，避免了内核内部处理带来的额外开销。处理完数据包之后，XDP 程序会返回一个动作（Action）作为输出，它代表了程序退出后对数据包应该做什么样的最终裁决。XDP 5 种动作名称及含义如下：

- XDP_ABORTED：意味着程序错误，会将数据包丢掉。
- XDP_DROP：会在网卡驱动层直接将该数据包丢掉，无需再进一步处理，也就是无需再耗费任何额外的资源。
- XDP_PASS：会将该数据包继续送往内核的网络协议栈，和传统的处理方式一致。这使得 XDP 可以在有需要的时候，继续使用传统的内核协议栈进行处理。
- XDP_TX：会将该数据包从同一块网卡返回。
- XDP_REDIRECT：则是将数据包重定向到其他的网卡或 CPU，结合 AF_XDP[^2]可以将数据包直接送往用户空间。

:::center
  ![](../assets/xdp.png)<br/>
 图 3-13 XDP 钩子在 Linux 系统的位置与 5 个动作
:::

只要具备了挂钩内核的能力，因此能够拦截进出主机的每个数据包，那就完全可以摆脱数据包在内核协议栈的冗长处理流程。以高性能知名的开源软件 Cilium 为例，它在 eBPF 和 XDP 钩子（也有其他的钩子）基础上，实现了一套全新的 conntrack 和 NAT 机制。并以此为基础，构建出如 L3/L4 负载均衡、网络策略、观测和安全认证等各类高级功能。

由于 Cilium 实现的底层网络功能现独立于 Netfilter，因此它的 conntrack 条目和 NAT 信息不会存储在内核中的 conntrack 表和 NAT 表中。常规的 Linux 命令 conntrack、netstat、ss 和 lsof 等，都无法查看 NAT 和 conntrack 数据。得使用 Cilium 提供的查询命令才行，例如：

```bash
$ cilium bpf nat list
$ cilium bpf ct list global
```


[^1]: Linux 内核开发者，自 2005 年开始，已经提交过 4989 个 patch，是 Linux 核心源代码第二大的贡献者。
[^2]: 相较 AF_INET 是基于传统网络的 Linux socket，AF_XDP 则是一套基于 XDP 的高性能 Linux socket。
