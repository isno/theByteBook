# 2.2.1 iptables 与 Netfilter

Linux 上最常用的防火墙工具是 iptables，可用于检测、修改转发、重定向以及丢弃 IPv4 数据包。同时，iptables 也是众多上层应用，例如 SLB、容器网络、kube-proxy 等实现基础。

iptables 的底层实现是 Netfilter，iptables 在用户空间管理数据包处理规则，内核中 netfilter 对 iptables 的配置对数据包进行处理。iptables 与 netFilter 的关系如图 2-2 所示。

<div  align="center">
	<img src="../assets/iptables.png" width = "320"  align=center />
	<p>图 2-2 iptables 与 netfilter 的关系</p>
</div>

## 1. netfilter hooks

netfilter 框架在内核协议栈的不同位置实现了 5 个 hook 点，每个进入网络系统的包（接收或发送）在经过协议栈时包经过协议栈时会触发内核模块注册在这里的处理函数 。触发哪个 hook 取决于包的方向（ingress/egress）、包的目的地址、包在上一个 hook 点是被丢弃还是拒绝等等。

下面几个 hook 是内核协议栈中已经定义好的：

- **NF_IP_PRE_ROUTING:** 接收到的包进入协议栈后立即触发此 hook，在进行任何路由判断 （将包发往哪里）之前
- **NF_IP_LOCAL_IN:** 接收到的包经过路由判断，如果目的是本机，将触发此 hook
- **NF_IP_FORWARD:** 接收到的包经过路由判断，如果目的是其他机器，将触发此 hook
- **NF_IP_LOCAL_OUT:** 本机产生的准备发送的包，在进入协议栈后立即触发此 hook
- **NF_IP_POST_ROUTING:** 本机产生的准备发送的包或者转发的包，在经过路由判断之后， 将触发此 hook


<div  align="center">
	<img src="../assets/netfilter.png" width = "550"  align=center />
	<p>图 2-3 数据包经过内核 hook </p>
</div>

## 2. iptables 表和链

iptables 使用 table（表） 来组织规则，并将不同功能的规则分为不同 table，例如，如果规则是处理网络地址转换的，那会放到 nat table，如果是判断是否允许包继续向前，那可能会放到 filter table。

在每个 table 内部，规则被进一步组织成 chain（链），内置的 chain 是由内置的 hook 触发。内核一共只有 5 个 netfilter hook，因此不同 table 的 chain 最终都是注册到这几个点，下面可以看出，内置的 chain 名字和 netfilter hook 名字是一一对应。

- PREROUTING: 由 NF_IP_PRE_ROUTING hook 触发
- INPUT: 由 NF_IP_LOCAL_IN hook 触发
- FORWARD: 由 NF_IP_FORWARD hook 触发
- OUTPUT: 由 NF_IP_LOCAL_OUT hook 触发
- POSTROUTING: 由 NF_IP_POST_ROUTING hook 触发



假设服务器知道如何路由数据包，而且防火墙允许数据包传输，下面就是不同场景下包转发流程：

- 收到的、目的是本机的包：PRETOUTING -> INPUT
- 收到的、目的是其他主机的包：PRETOUTING -> FORWARD -> POSTROUTING
- 本地产生的包：OUTPUT -> POSTROUTING


<div  align="center">
	<img src="../assets/iptables-chain.png" width = "450"  align=center />
</div>

通过上图，我们可以看到对于一个收到目的是本机的包：首先依次经过 PRETOUTING chain 上面的 mangle、nat table，然后依次经过 INPUT chain 的 mangle、filter、nat table，然后才会到达本机某个 socket。

## 3. iptables 规则

规则放置在特定 table 的特定 chain 里面。当 chain 被调用的时候，包会依次匹配 chain 里面的规则。每条规则都有一个匹配部分和一个动作部分。规则的匹配部分指定了一些条件，包必须满足这些条件才会和相应的将要执行的动作`target`进行关联。target 分为两种类型：

- 终止目标（terminating targets）：这种 target 会终止 chain 的匹配，将控制权 转移回 netfilter hook。根据返回值的不同，hook 或者将包丢弃，或者允许包进行下一 阶段的处理。
- 非终止目标（non-terminating targets）：非终止目标执行动作，然后继续 chain 的执行。虽然每个 chain 最终都会回到一个终止目标，但是在这之前，可以执行任意多个非终止目标。

### 3.1  跳转到用户自定义 chain

这里要介绍一种特殊的非终止目标：跳转目标（jump target），jump target 是跳转到其他 chain 继续处理的动作。iptables 也支持管理员创建他们自己的用于管理目的的 chain。不过用户定义的 chain 只能通过从另一个规则跳转（jump）到它，因为它们没有注册到 netfilter hook。

用户定义的 chain 可以看作是对调用它的 chain 的扩展。例如，用户定义的 chain 在结 束的时候，可以返回 netfilter hook，也可以继续跳转到其他自定义 chain。这种设计使框架具有强大的分支功能，使得管理员可以组织更大更复杂的网络规则。

<div  align="center">
	<img src="../assets/custom-chain.png" width = "550"  align=center />
	<p></p>
</div>



kubernetes 利用自定义链模块化地实现了数据包 DNAT。KUBE-SERVICE 作为整个反向代理的入口链，KUBE-SVC-XXX 链为具体某一服务的入口链，KUBE-SEP-XXX 链代表某一个具体的 Pod 地址和端口，即 Endpoint，

KUBE-SERVICE 链会根据具体的服务 IP 跳转至具体的的 KUBE-SVC-XXX 链，然后 KUBE-SVC-XXX 链再根据一定的负载均衡算法跳转至 Endpoint 链。其结构如图所示。


<div  align="center">
	<img src="../assets/k8s-chain.png" width = "400"  align=center />
	<p></p>
</div>


## 3. netfilter 与 kubernetes 网络

<div  align="center">
	<img src="../assets/netfilter-k8s.png" width = "600"  align=center />
	<p>图: kubernetes 网络</p>
</div>

数据包从 Pod 网络 Vthe 接口发送到 cni0 虚拟网桥，进入主机协议栈之后，首先会经过 PREROUTING，调用相关的链做 DNAT，经过 DNAT 处理后，数据包的目的地址变成另外一个 Pod 地址，再继续转发至 eth0，发给正确的集群节点。




## iptables 更新延迟的问题

由于每条规则长度不等、内部结构复杂，且同一规则集位于连续的内存空间，iptables 使用全量替换的方式来更新规则，这使得我们能够从用户空间以原子操作来添加/删除规则，但非增量式的规则更新会在规则数量级较大时带来严重的性能问题。

假如在一个大规模 Kubernetes 集群中使用 iptables 实现 Kube-Proxy，当 service 数量较多时，哪怕更新一个 service 也会整体修改 iptables 规则表。全量提交的过程会 kernel lock 进行保护，因此会有很大的更新时延。

当 service 数量较多时，可以尝试在 Kubernetes 集群中使用基于 ipset 的 ipvs 实现 Kube-Proxy， 采用增量更新的方式保证service提供更加稳定的服务。


