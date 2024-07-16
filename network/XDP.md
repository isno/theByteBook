# 3.4.4 快速数据路径 XDP

通过本章开篇介绍的 Linux ingress 架构，相信读者已经了解“**高并发下网络协议栈的冗长流程是最主要的性能负担，内核是网络密集型任务的瓶颈所在**”。

2010 年，由 Intel 领导的 DPDK 实现了一个基于内核旁路（Kernel bypass）思想的高性能网络应用开发解决方案，并逐渐成为了独树一帜的成熟技术体系。但是 DPDK 也基于内核旁路这一前提，天然就无法与内核技术生态很好的结合。

2016 年，在 Linux Netdev 会议上，David S. Miller[^1] 喊出了 “DPDK is not Linux” 的口号。同年，伴随着 eBPF 技术的成熟，Linux 内核终于迎来了属于自己的高速公路 —— XDP（eXpress Data Path，快速数据路径），其具有足以媲美 DPDK 的性能以及背靠 Linux 内核的多种独特优势。

## 1. XDP 概述

XDP 本质上是 Linux 内核网络模块中的一个 BPF Hook，能够动态挂载 eBPF 程序逻辑，**使得 Linux 内核能够在数据报文到达 L2（网卡驱动层）时就对其进行针对性高速处理，无需再“循规蹈矩”地进入到内核网络协议栈**。

如图 3-13 所示，XDP 程序在内核提供的网卡驱动中直接取得网卡收到的数据帧，你会看到数据并不经过内核网络协议栈，而是直达用户态应用程序，应用程序利用 AF_XDP 类型的 socket 接收数据。

:::tip AF_XDP
类同 AF_INET 用于 IPv4 类型地址的通讯，AF_XDP 则是一套基于 XDP 的通讯的实现。
:::

:::center
  ![](../assets/XDP.svg)<br/>
 图 3-13 XDP 处理数据包的过程
:::

XDP 在业界最出名的一个应用场景就是 Facebook 基于 XDP 实现高效的防 DDoS 攻击，其本质上就是实现尽可能早地实现“丢包”，而不去消耗系统资源创建完整的网络栈链路。

那么，我们第一个 XDP 程序就来模拟防 DDoS 最重要的操作，丢弃所有的数据包。编写下面的代码，确保你的内核不低于 4.15，且已安装好相应的编译工具。

```c
#include <linux/bpf.h>
/*
 * Comments from Linux Kernel:
 * Helper macro to place programs, maps, license in
 * different sections in elf_bpf file. Section names
 * are interpreted by elf_bpf loader.
 * End of comments
 * You can either use the helper header file below
 * so that you don't need to define it yourself:
 * #include <bpf/bpf_helpers.h> 
 */
#define SEC(NAME) __attribute__((section(NAME), used))
SEC("xdp")
int xdp_drop_the_world(struct xdp_md *ctx) {
    // drop everything
  // 意思是无论什么网络数据包，都drop丢弃掉
    return XDP_DROP;
}
char _license[] SEC("license") = "GPL";
```

接下来就是编译工作了，利用 clang 命令行工具配合后端编译器 LLVM 来进行操作。

```bash
$ clang -O2 -target bpf -c xdp-drop-world.c -o xdp-drop-world.o
```

加载 XDP 程序要用到 ip 这个命令行工具，它能帮助我们将程序加载到内核的 XDP Hook 上。

```bash
[root@Node1 ~]# link set dev [device name] xdp obj xdp-drop-world.o
[root@Node2 ~]# ping 192.168.1.3
PING 192.168.1.3 (192.168.1.3): 56 data bytes
Request timeout for icmp_seq 0
Request timeout for icmp_seq 1
Request timeout for icmp_seq 2
```

上面的命令中，[device name] 是本机某个网卡设备的名称。将 XDP 程序加载到内核后，从外部 ping 名为[device name] 网卡的 IP，你将看到完全 ping 不通。

接下来，将 XDP 程序从网卡卸载，你会看到 ping 又正常了。

```bash
[root@Node1 ~]# link set dev [device name] xdp off
[root@Node2 ~]# ping 192.168.1.3
PING 192.168.1.3 (192.168.1.3): 56 data bytes
64 bytes from 192.168.1.3: icmp_seq=0 ttl=53 time=42.608 ms
64 bytes from 192.168.1.3: icmp_seq=1 ttl=53 time=43.902 ms
64 bytes from 192.168.1.3: icmp_seq=2 ttl=53 time=42.829 ms
```

## 2. XDP 应用示例

前面讲过的 conntrack 是 Netfilter 在 Linux 内核中的连接跟踪实现。换句话说，只要具备了 hook 能力，能拦截到进出主机的每个数据包，就完全可以摆脱 Netfilter，实现另外一套连接跟踪。

云原生网络方案 Cilium 在 1.7.4+ 版本就实现了这样一套独立的连接跟踪和 NAT 机制，其基本原理是：

- 基于 BPF hook 实现数据包的拦截功能（等价于 netfilter 的 hook 机制）。
- 在 BPF hook 的基础上，实现一套全新的 conntrack 和 NAT。

因此使用 Cilium 解决 Kubernetes 容器间通信时，即便在 Node 节点卸载 Netfilter，也不会影响 Cilium 对 Kubernetes ClusterIP、NodePort、ExternalIPs 和 LoadBalancer 等功能的支持。

:::center
  ![](../assets/cilium.svg)<br/>
 图 3-14 Cilium 方案中实现的 conntrack
:::

由于 Cilium 方案的连接跟踪机制独立于 Netfilter，因此它的 conntrack 和 NAT 信息也没有存储在内核中的 conntrack table 和 NAT table 中，常规的 conntrack/netstats/ss/lsof 等工具看不到 nat、conntrack 数据，所以得另外使用 Cilium 的命令查询，譬如：

```bash
$ cilium bpf nat list
$ cilium bpf ct list global
```

[^1]: Linux 内核开发者，自 2005 年开始，已经提交过 4989 个 patch，是 Linux 核心源代码第二大的贡献者。

