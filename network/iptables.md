# 3.3.2 数据包过滤工具 iptables

Netfilter 的钩子回调固然强大，但得通过程序编码才能使用，并不适合系统管理员日常运维。为此，基于 Netfilter 框架开发的应用便出现了，典型的就是 Xtables 系列，包括 iptables，nftables，ebtables，arptables，ip6tables 等。

用过 Linux 系统的工程师多多少少都使用过 iptables，它常被称为 Linux 系统“自带的防火墙”。严谨地讲，iptables 能做的事情其实远超防火墙的范畴，它的定位应是能够代替 Netfilter 多数常规功能的 IP 包过滤工具。

## 1. iptables 表和链

iptable 将注册在 netfilter 钩子处的回调函数进一步抽象

iptable 有 5 个内置链（PREROUTING、INPUT、FORWARD、OUTPUT、POSTROUTING），可以看出这几个内置链对应 Netfilter hook。当数据包经过 netfilter 的 hook 时，数据包依次匹配里面的规则。


iptables 把一些常用数据包管理操作总结成具体的动作，下面列出部分动作供读者参考：

- ACCEPT：允许数据包通过，继续执行后续的规则。
- DROP：直接丢弃数据包；
- RETURN：跳出当前规则“链”（Chain，稍后解释），继续执行前一个调用链的后续规则。
- DNAT：修改数据包的目标网络地址。
- SNAT：修改数据包的源网络地址。
- REDIRECT：在本机上做端口映射，比如将 80 端口映射到 8080，访问 80 端口的数据包将会重定向到 8080 端口对应的监听服务。
- REJECT：功能与 DROP 类似，只不过它会通过 ICMP 协议给发送端返回错误信息，比如 Destination network unreachable 或者 Destination host。
- MASQUERADE：地址伪装，可以理解为动态的 SNAT。通过它可以将源地址绑定到某个网卡上，因为这个网卡的 IP 可能是动态变化的，此时用 SNAT 就不好实现；
- LOG：内核对数据包进行日志记录。

不同的链上能处理的事情有区别，而相同的动作放在一起也便于管理，比如数据包过滤的动作（ACCEPT，DROP，RETURN，REJECT 等）可以合并到一处，数据包的修改动作（DNAT、SNAT）可以合并到另外一处，这便有了动作规则表的概念。

将规则表与链进行关联，而不是规则本身与链关联，通过一个中间层解耦了链与具体的某条规则，原先复杂的对应关系就变得简单了。iptable 的 5 张表为：
 
- raw 表：配置该表主要用于去除数据包上的连接追踪机制。默认情况下，连接会被跟踪，所以配置该表后，可以加速数据包穿越防火墙，提高性能。
- mangle 表：修改数据包内容，常用于数据包报文头的修改，比如服务类型（Type of Service, ToS），生存周期（Time to Live, TTL），Mark 标记等。
- nat 表：用于修改数据包的源地址或目标地址，实现网络地址转换。当数据包进入协议栈的时候，nat 表中的规则决定是否以及如何修改包的源/目的地址，以改变包被 路由时的行为。nat 表通常用于将包路由到无法直接访问的网络。
- filter 表：数据包过滤，控制到达某条链上的数据包是放行（ACCEPT），还是拒绝（REJECT），或是丢弃（DROP）等。iptables 命令的使用规则：iptables [-t table] ...，如果省略 -t table，则默认操作的就是 filter 表。
- security 表：安全增强，一般用于 SELinux 中，其他情况并不常用。


一个链上可以关联的表可以有多个，所以这 5 张表在一个链上执行的时候得有个顺序：raw --> mangle --> nat --> filter --> security，即先去连接追踪，再改数据包，然后做源或目标地址转换，最后是过滤和安全。数据包具体经过的表、链的关系和顺序如图 3-6 所示。

:::center
  ![](../assets/Netfilter-packet-flow.svg)<br/>
  图 3-2 数据包通过 Netfilter 时的流向过程 [图片来源](https://en.wikipedia.org/wiki/Netfilter)
:::


## 2. iptables 自定义链

除了 5 个内置链外，iptables 支持管理员创建用于实现某些管理目的自定义链。向自定义链添加规则和向内置链规则的方式是一样的。不同的地方在于，自定义链只能通过从另一个规则跳转（jump）到它。

自定义链可以看作是对调用它的链的扩展，例如自定义链结束的时候，可以返回内置链，也可以再继续跳转到其他自定义链。这种设计使 iptables 具有强大的分支功能，管理员可以组织更大更复杂的网络规则。

容器管理系统 Kubernetes 中 kube-proxy 组件的 iptables 模式就是利用自定义链模块化地实现了 Service 功能。

一旦创建一个 Service，Kubernetes 就会在主机添加这样一条 iptable 规则。

```bash
-A KUBE-SERVICES -d 10.0.1.175/32 -p tcp -m tcp --dport 80 -j KUBE-SVC-NWV5X
```
这条 iptables 规则的含义是：凡是目的地址是 10.0.1.175、目的端口是 80 的 IP 包，都应该跳转到另外一条名叫 KUBE-SVC-NWV5X 的 iptables 链进行处理。目的地 10.0.1.175 其实就是 Service 的 VIP（Virtual IP Address，虚拟 IP 地址）。可以看到，它只是 iptables 中一条规则的配置，并没有任何网络设备，所以 ping 不通。

接下来的 KUBE-SVC-NWV5X 是一组规则的集合，如下所示：

```bash
-A KUBE-SVC-NWV5X --mode random --probability 0.33332999982 -j KUBE-SEP-WNBA2
-A KUBE-SVC-NWV5X --mode random --probability 0.50000000000 -j KUBE-SEP-X3P26
-A KUBE-SVC-NWV5X -j KUBE-SEP-57KPR
```

可以看到，这一组规则实际上是一组随机模式（–mode random）的自定义链。随机转发的目的地为 `KUBE-SEP-<hash>` 自定义链。所以这一组规则就是 Service 实现负载均衡的位置。

查看自定义链`KUBE-SEP-<hash>`的明细，我们就很容易理解 Service 进行转发的具体原理了，如下所示：

```bash
-A KUBE-SEP-WNBA2 -s 10.244.3.6/32  -j MARK --set-xmark 0x00004000/0x00004000
-A KUBE-SEP-WNBA2 -p tcp -m tcp -j DNAT --to-destination 10.244.3.6:9376
```
可以看到，自定义链`KUBE-SEP-<hash>`实际是一条 DNAT 规则。DNAT 规则的作用就是在 PREROUTING 检查点之前，也就是在路由之前，将流入 IP 包的目的地址和端口，改成 –to-destination 所指定的新的目的地址和端口。可以看到，目的地址和端口 10.244.3.6:9376，正是被代理 Pod 的 IP 地址和端口。

这样，访问 Service VIP 的 IP 包经过上述 iptables 处理之后，就已经变成了访问具体某一个后端 Pod 的 IP 包了。

## 3. iptables 性能问题

容器编排系统 Kubernetes 中，用来处理流量分发和请求转发的组件 kube-proxy 有两种工作模式：iptables 和 IPVS，两者区别如下：

- iptables 模式完全使用 iptables 规则处理流量和负载均衡。iptable 规则匹配是线性的，时间复杂度是 O(N)。规则更新是非增量式的，哪怕增加/删除一条规则，也是修改整体的 iptables 规则表。当集群内 Service 数量较多，修改或者匹配负载均衡规则，会对集群性能有不小的影响；
- ipvs 模式使用内核中 IPVS 模块创建虚拟机的方式实现负载均衡（并非利用 iptables 规则），性能和 Service 规模无关。

不过需要注意的是，IPVS 模块只负责上述的负载均衡和代理功能。而一个完整的 Service 流程正常工作所需要的包过滤、SNAT 等操作，还是要靠 iptables 来实现。只不过，这些辅助性的 iptables 规则数量有限，也不会随着 Pod 数量的增加而增加。

如图 3-9 所示的基准测试，当 1,000 个服务（10,000 个 Pod）以上时，这两个模式的性能表现产生明显差异。

:::center
  ![](../assets/iptables-vs-ipvs.png)<br/>
  图 3-9 iptables 与 IPVS 的性能差异 [图片来源](https://www.tigera.io/blog/comparing-kube-proxy-modes-iptables-or-ipvs/)
:::

所以，当 Kubernetes 管理的节点规模较大时，应该避免使用 iptables 模式。如果 CNI 插件使用的是 Cilium，还可以创建一个没有 kube-proxy 的 Kubernetes 集群，减少 iptables/netfilter 的影响，全方位提升网络性能。 
