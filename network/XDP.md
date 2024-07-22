# 3.5.2 eBPF 和 快速数据路径 XDP 

由于 DPDK 完全基于“内核旁路”这一思想，天然就无法与内核技术生态很好的结合。

2016 年，在 Linux Netdev 会议上，David S. Miller[^1] 喊出了 “DPDK is not Linux” 的口号。同年，伴随着 eBPF 技术的成熟，Linux 内核终于迎来了属于自己的高速公路 —— XDP（eXpress Data Path，快速数据路径），其具有足以媲美 DPDK 的性能以及背靠 Linux 内核，无需第三方代码库和许可、无需专用的 CPU 等多种独特优势。

## 1. eBPF 技术简介

DPDK 技术是完全绕过内核，直接将数据包传递到用户空间处理。XDP 正好相反，XDP 选择完全在内核空间中执行我们定义好的程序来处理数据包。

那么，如何在内核中执行用户态定义的程序呢？这就得用到 BPF（Berkeley Packet Filter，伯克利包过滤器）技术了，**一种允许用户在内核空间运行经过安全验证的代码的机制**。

自 Linux 内核版本 2.5 起就开始支持 BPF，但早期的 BPF 主要用于网络数据包的捕获和过滤。到了 Linux 内核 3.18 版本，开发者推出了一套全新的 BPF 架构，也就是我们今天所说的 eBPF（Extended Berkeley Packet Filter）。

与早期的 BPF 相比，eBPF 的功能不再局限于网络分析，它几乎可以访问 Linux 内核所有能关联的任何资源，并逐渐发展成为一个多功能的通用执行引擎，适用于网络优化（Networking）、系统安全（Security）、可观测及系统追踪（Observability、Tracing）多种场景。

:::center
  ![](../assets/ebpf.webp)<br/>
 图 3-13 eBPF 的技术架构
:::

如今，许多文档中提到的 BPF 实际上指的是 eBPF，而将早期的 BPF 称为 cBPF（Classic Berkeley Packet Filter）。

## 2. XDP 实际是 eBPF 的钩子

XDP 本质是一个特殊的 eBPF 钩子，它允许开发人员在网络数据包进入内核的早期阶段（网卡驱动层内，数据包进入网络协议栈之前），使用 eBPF 程序操作网络数据包，进行高效处理。

如图 3-13 所示，eBPF 程序通过不同的 XDP 动作码来决定网络数据包的不同处理方式：

- XDP_ABORTED 意味着程序错误，会将数据包丢掉。
- XDP_DROP 会在网卡驱动层直接将该数据包丢掉，无需再进一步处理，也就是无需再耗费任何额外的资源。
- XDP_PASS 会将该数据包继续送往内核的网络协议栈，和传统的处理方式一致。这也使得 XDP 可以在有需要的时候方便地使用传统的内核协议栈进行处理。
- XDP_TX 会将该数据包从同一块网卡返回。
- XDP_REDIRECT 则是将数据包重定向到其他的网卡或 CPU，结合 AF_XDP[^2]可以将数据包直接送往用户空间。

:::center
  ![](../assets/xdp.png)<br/>
 图 3-13 XDP 架构概览
:::

XDP 在业界最出名的一个应用是 Facebook 的 Katran 系统，该系统实现了高效的防 DDoS 攻击，其本质上就是尽可能早的 XDP_DROP “丢包”，从而瓦解 DDoS 的根本目标 —— 占满被攻击主机的 CPU 资源使得其他正常流量无法被处理。


## 3. XDP 与 eBPF 应用示例

前面讲过的 conntrack 是 Netfilter 在 Linux 内核中的连接跟踪实现。换句话说，只要具备了 hook 内核的能力，能拦截到进出主机的每个数据包，就完全可以摆脱 Netfilter，实现另外一套连接跟踪。

云原生网络方案 Cilium 在 1.7.4+ 版本就实现了这样一套独立的连接跟踪和 NAT 机制，其基本原理是：

- 基于 BPF hook 实现数据包的拦截功能（等价于 Netfilter 的 hook 机制）。
- 在 BPF hook 的基础上，实现一套全新的 conntrack 和 NAT。

因此使用 Cilium 作为 Kubernetes 容器间通信解决方案时，即便 Node 节点内卸载 Netfilter，也不会影响 Cilium 对 Kubernetes ClusterIP、NodePort、ExternalIPs 和 LoadBalancer 等功能的支持。

:::center
  ![](../assets/cilium.svg)<br/>
 图 3-14 Cilium 方案中实现的 conntrack
:::

由于 Cilium 方案的连接跟踪机制独立于 Netfilter，因此它的 conntrack 和 NAT 信息也没有存储在内核中的 conntrack table 和 NAT table 中，常规的 conntrack/netstats/ss/lsof 等工具看不到 NAT、conntrack 数据，得另外使用 Cilium 提供的查询命令，例如：

```bash
$ cilium bpf nat list
$ cilium bpf ct list global
```

[^1]: Linux 内核开发者，自 2005 年开始，已经提交过 4989 个 patch，是 Linux 核心源代码第二大的贡献者。
[^2]: 相较 AF_INET 是基于传统网络的 Linux socket，AF_XDP 则是一套基于 XDP 的高性能 Linux socket。
