# 3.2.1 iptables 与 Netfilter

作为 Linux 上最常用的防火墙工具 -- iptables，是众多的应用 SLB（Server Load Balancer，负载均衡）、容器网络、Kube-Proxy 的实现基础。而 iptables 的底层实现则是 Netfilter，iptables 在用户空间管理数据包处理规则，内核中 Netfilter 根据 iptables 的配置对数据包进行处理，它们的关系如图3-6 所示。

<div  align="center">
	<img src="../assets/iptables.png" width = "320"  align=center />
	<p>图3-6 iptables 与 netfilter 的关系</p>
</div>

## 1. table 与 chain

iptables 使用 table（表）来组织规则，并将不同功能的规则分为不同 table，如果规则是处理网络地址转换的，那会放到 nat table，如果是判断是否允许包继续向前，那可能会放到 filter table。每个 table 内部，规则被进一步组织成 chain（规则链）当 chain 被调用的时候，数据包依次匹配 chain 里面的规则。

内置的 chain 由内置的 hook 触发，内核中有 5 个 定义好的 hook 和内置的 chain一一对应。这几个内置 chain 功能如下：

- **PRETOUTING:** 接收到的包进入协议栈后立即触发此 chain，在进行任何路由判断（将包发往哪里）之前。
- **INPUT:** 接收到的包经过路由判断，如果目的是本机，将触发此 chain。
- **FORWARD** 接收到的包经过路由判断，如果目的是其他机器，将触发此 chain。
- **OUTPUT:** 本机产生的准备发送的包，在进入协议栈后立即触发此 chain。
- **POSTROUTING:** 本机产生的准备发送的包或者转发的包，在经过路由判断之后，将触发此 chain。

我们看一条 iptbales 的规则示例：在 INPUT chain 增加一条规则，对来自 eth0 接口，协议为 TCP，目标端口 80，连接状态(conntrack) 为 NEW,ESTABLISHED 的数据包执行 ACCEPT 动作。
```
iptables -A INPUT -i eth0 -p tcp --dport 80 -m state --state NEW,ESTABLISHED -j ACCEPT
```

根据上面对 iptables 表、链以及 hook 的解释，我们看一下数据包的转发流程。假设服务器知道如何路由数据包，而且防火墙允许数据包传输，数据包转发流程如下：

- 目的是本机的包：PRETOUTING -> INPUT
- 目的是其他主机的包：PRETOUTING -> FORWARD -> POSTROUTING
- 本地产生的包：OUTPUT -> POSTROUTING

如图3-7所示，一个目的是本机的数据包依次经过 PRETOUTING chain 上面的 mangle、nat table，然后再依次经过 INPUT chain 的 mangle、filter、nat table，最后到达本机某个具体应用。

<div  align="center">
	<img src="../assets/iptables-chain.png" width = "450"  align=center />
	<p>图3-7 iptables 中 chain 和 table 关系</p>
</div>

## 2. 自定义 chain

iptables 规则允许数据包跳转（jump）到其他 chain 继续处理，同时 iptables 也支持创建自定义的 chain，不过自定义 chain 没有注册到 Netfilter hook，所以用户定义 chain 只能通过从另一个规则跳转（jump）到它。

<div  align="center">
	<img src="../assets/custom-chain.png" width = "500"  align=center />
	<p>图3-8 iptables 自定义链</p>
</div>

用户定义 chain 可以看作是对调用它的 chain 的扩展，用户定义 chain 在结束的时候，可以返回 netfilter hook，也可以再继续跳转到其他自定义 chain，这种设计使框架具有强大的分支功能，使得管理员可以组织更大更复杂的网络规则。

kubernetes 中 kube-proxy 组件 iptbales 模式就是利用自定义 chain 模块化地实现了 Service 机制，其架构如图3-9 所示。KUBE-SERVICE 作为整个反向代理的入口链，KUBE-SVC-XXX 为具体某一服务的入口链，KUBE-SEP-XXX 链代表某一个具体的 Pod 地址和端口，即 Endpoint。KUBE-SERVICE 链会根据具体的服务 IP 跳转至具体的 KUBE-SVC-XXX 链，然后 KUBE-SVC-XXX 链再根据一定的负载均衡算法跳转至 Endpoint 链。

<div  align="center">
	<img src="../assets/k8s-chain.png" width = "450"  align=center />
	<p>图3-9 kubernetes 中 kube-porxy组件 iptables 模式自定义链</p>
</div>

## 3. iptables 应用问题

在 Kubernetes 中 Kube-Proxy 组件有两种模式：iptables 和 IPVS。不过 iptables 定位是为防火墙而设计，iptables 的规则链是一种线性表，时间复杂度为 O(n) ，规则的遍历和更新成线性延时，当集群内 Service 数量较多，则会有较大的性能问题。而 IPVS 则专门用于高性能负载均衡，实现上使用了更高效的哈希表，时间复杂度为 O(1)，性能与规模无关，如表 2-1 所示。

表 2-3 不同模式、规模下增加规则的延迟

|  |  | ||
|:--|:--|:--|:--|
| of Services | 1 | 5,000 | 20,000 |
| of Rules | 8 |  40,000|  160,000|
| iptables| 2 ms| 11 min | 5 hours |
| ipvs  |  2 ms | 2ms | 2 ms |

所以，当 Kubernetes 规模较大时，应避免使用 iptables 模式。
