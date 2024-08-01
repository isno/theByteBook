# 3.3.1 Netfilter

Netfilter 是 Linux 内核中的一个强大的网络子系统，它提供了网络数据包过滤、网络地址转换（NAT）、数据包的修改和多种其他网络相关操作的功能。

如果把数据包比作流水，Netfilter 相当于在 Linux 系统中的“水管”装了 5 个阀门（术语称 hook）[^1]。用户空间的程序（如 iptables、IPVS 等）可以向这些 hook 点注册钩子函数，添加数据包处理规则。当有数据包经过时，就会自动触发注册在这里的钩子函数，从而干预 Linux 的网络通信，实现数据包的过滤、修改、SNAT/DNAT 等各种功能。

这 5 个 hook 分别是：

- PREROUTING：数据包进入内核协议栈后立即触发此 hook，在进行任何路由判断（将包发往哪里）之前。
- LOCAL_IN：接收到的包经过路由判断，如果目的是本机，将触发此 hook。
- FORWARD：数据包经过路由判断，如果目的是其他机器，将触发此 hook。
- LOCAL_OUT：本机产生的准备发送的包，在进入协议栈后立即触发此 hook。
- POST_ROUTING：本机产生的准备发送的包或者转发的包，在经过路由判断之后，将触发此 hook。




如图 3-2 所示的“数据包通过 Netfilter 时的流向过程”，里面包含了 XDP、Netfilter 和 traffic control 部分，是参考内核协议栈各 hook 点位置和 iptables 规则优先级的经典配图。

:::center
  ![](../assets/Netfilter-packet-flow.svg)<br/>
  图 3-2 数据包通过 Netfilter 时的流向过程 [图片来源](https://en.wikipedia.org/wiki/Netfilter)
:::




如图 3-4 Kubernetes 网络模型说明，当一个 Pod 跨 Node 进行通信时经过了哪些“管道”。

首先，数据包从 Pod 的 veth-pair 接口发送到 cni0 虚拟网桥，cni 网桥把数据包送到主机协议栈，经过 PREROUTING hook，调用相关的链做 DNAT，经过 DNAT 处理后，数据包目的地址变成另外一个 Pod 地址。

因为开启了 ip_forword，Linux 具有了路由功能，内核协议栈判断目的地不属于本机，经过 FORWARD、POST_ROUTING 到达 eth0，最后通过主机网络发送到其他节点。

:::center
  ![](../assets/netfilter-k8s.svg)<br/>
  图 3-4 Pod 发起请求另外一个节点，经过 Linux bridge、PREROUTING、FORWARD、POSTROUTING 
:::

对 Linux 内核网络框架基本了解之后，我们继续了解 Netfilter 的上层应用 iptables。


[^1]: hook 设计模式在其他软件系统中随处可见，譬如 eBPF、Git、Kubernetes 等等，Kubernetes 在编排调度、网络、资源定义等通过暴露接口的方式，允许用户根据自己的需求插入自定义代码或逻辑来扩展 Kubernetes 的功能。 