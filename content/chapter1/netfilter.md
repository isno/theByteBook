# iptables与netfilter

iptables 在SLB、Docker和Kubernetes 等网络应用中非常广泛。

比如容器和宿主机端口映射、Kubernetes Service的默认模式、kube-proxy中的 iptables和IPVS模式、CNI的 portmap 插件等等都是通过iptables实现的。

因为了解iptables，对后续理解SLB、云原生网络等概念大有裨益。


## netfilter 

iptables的底层实现是netfilter。

netfilter是 Linux内核 2.4 引入的一个通用、抽象的网络框架，它提供一整套hook函数的管理机制，使得数据包过滤、包处理（设置标志位、修改TTL）、地址伪装、网络地址转化、访问控制、协议连接跟踪等成为可能。

在IPv4的数据包流程中，有五个重要的hook，分别是 PRE_ROUTING、LOCAL_IN、IP_FORWARD、LOCAL_OUT、POST_ROUTING。

netfilter的原理如下：

<div  align="center">
	<img src="../assets/netfilter.png" width = "550"  align=center />
</div>

当网卡收到一个包送达协议栈时，会在这几个关键 hook 处，判断是否有相应的钩子函数，然后进行处理。

- **PRE_ROUTING:** 是所有接收数据包到达的第一个hook触发点，此处将进行数据包目的地转换 (DNAT), 决定数据包是发给 本地进程、其他机器、其他network namespace
- **LOCAL_IN:** 经过路由判断后，目标地址是本机的接收数据包到达此hook触发点
- **FORWARD:** 经过路由判断后，目标地址不是本机地址的数据包到达此hook触发点
- **LOCAL_OUT:** 所有本地生成的发往其他机器的包, 在进入网络栈后首先到达此hook触发点
- **POST_ROUTING:** 本机产生准备发出的包或者转发的包，在经过路由判断后到达此hook触发点


现在构建在netfilter hook之上的用户态程序有 ebtables、arptables、iptables、iptables-nftables、conntrack（连接跟踪）。

可有说整个Linux系统网络都是构建在 netfilter 之上。

## iptables

iptables则是netfilter的操作接口，iptables 在用户空间管理应用于数据包的自定义规则，netfilter执行规则所对应的策略对数据包进行处理。

<div  align="center">
	<p>图：iptables与netfilter的关系</p>
	<img src="../assets/iptables.png" width = "420"  align=center />
</div>

iptables 分为两部分：

- 用户空间的 iptables 命令向用户提供访问内核 iptables 模块的管理界面。
- 内核空间的 iptables 模块在内存中维护规则表，实现表的创建及注册。

iptables 有个`四表五链`的概念。每一个链挂相应的表对IP数据包进行流经处理判断。 

五链是对应 netfilter的5个hook的内置链（除这五链之外，用户也可以自定义链））。 四表如下：

- **raw表**: 负责去除数据包上的连接追踪机制（iptables默认开启对数据包的连接追踪）
- **mangle表**： 负责数据包的拆解、修改、再封装
- **nat表** 负责数据包的网络地址转换
- **filter表** 负责数据包过滤功能，drop 或者 reject。


我们扩充一下图1. 一个IP包经过 iptables 的处理流程如下

<div  align="center">
	<img src="../assets/iptables-chain.png" width = "450"  align=center />
</div>

实际上 iptables的规则就是挂在netfilter钩子上的函数，用来修改IP数据包的内容或者过滤数据包，iptables的表就是所有规则的逻辑集合。

一般情况下一条iptables的规则包含两个部分：`匹配条件`和`动作`。匹配条件比如协议类型、源ip、目的ip、源端口号等，匹配条件可以组合，匹配之后动作有如下几种：

- `DROP`：直接将数据包丢弃
- `REJECT` 给客户端返回 `connection refused` 或 `destination unreachable`报文。
- `QUEUE` 将数据包放入用户空间队列，供用户空间程序使用
- `RETURN` 跳出当前链，后续规则不再处理
- `ACCEPT` 允许数据包通过
- `JUMP` 跳转到用户自定义的其他链继续执行

理解iptables的链、表、规则的概念之后，我们来介绍一下iptables的命令用法。

## iptables 规则用法



**iptables 更新延迟的问题**

由于每条规则长度不等、内部结构复杂，且同一规则集位于连续的内存空间，iptables 使用全量替换的方式来更新规则，这使得我们能够从用户空间以原子操作来添加/删除规则，但非增量式的规则更新会在规则数量级较大时带来严重的性能问题。

假如在一个大规模 Kubernetes 集群中使用 iptables 方式实现 Service，当 service 数量较多时，哪怕更新一个 service 也会整体修改 iptables 规则表。全量提交的过程会 kernel lock 进行保护，因此会有很大的更新时延。
