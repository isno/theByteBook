# 3.3.2 数据包过滤工具 iptables

Netfilter 的钩子回调固然强大，但得通过程序编码才能使用，并不适合系统管理员日常运维。

用过 Linux 系统的工程师多多少少都使用过 iptables，它常被称为 Linux 系统“自带的防火墙”。严谨地讲，iptables 能做的事情其实远超防火墙的范畴，它的定位应是能够代替 Netfilter 多数常规功能的 IP 包过滤工具。

Netfilter 与 iptables 两者之间的关系如图 3-5 所示，iptables 在用户空间管理数据包处理规则，内核中 Netfilter 根据 iptables 的配置规则对数据包进行处理。

:::center
  ![](../assets/iptables.png)<br/>
  图 3-5 iptables 与 Netfilter 的关系
:::

## 1. iptables 表和链

iptables 包括了“tables（表）”、“chain（链）”和“rules（规则）” 3 个概念。

iptables 使用表来组织规则，如果规则是处理网络地址转换的，那会放到 nat 表，如果是判断是否允许包继续向前，那可能会放到 filter 表。每个表内部规则被进一步组织成链。

iptable 有 5 个内置链（PREROUTING、INPUT、FORWARD、OUTPUT、POSTROUTING），可以看出这几个内置链对应 Netfilter hook。当数据包经过 netfilter 的 hook 时，数据包依次匹配里面的规则。

如图 3-6 所示，一个目的是本机的数据包依次经过 PREROUTING 链上面的 mangle、nat 表，然后再依次经过 INPUT 链的 mangle、filter、nat 表，最后到达本机某个应用。

:::center
  ![](../assets/iptables-chain.png)<br/>
  图 3-6 iptables 中链和表的关系
:::

## 2. iptables 自定义链

iptables 规则允许数据包跳转到其他链继续处理，同时 iptables 也支持创建自定义链，不过自定义链没有注册到 Netfilter hook，自定义链只能通过规则跳转到它。

自定义链可以看作是对调用它的链的扩展，自定义链结束的时候，可以返回 Netfilter hook，也可以再继续跳转到其他自定义链，这种设计使 iptables 具有强大的分支功能，管理员可以组织更大更复杂的网络规则。

Kubernetes 中 kube-proxy 组件的 iptables 模式就是利用自定义链模块化地实现了 Service 功能。

通过下面的命令，查看 kube-proxy 创建的自定义链。

```bash
$ iptables -S -t nat
-A PREROUTING -m -comment --comment "kubernetes service portals" -j KUBE-SERVICES
-A OUTPUT -m -comment --comment "kubernetes service portals" -j KUBE-SERVICES
-A POSTROUTING -m -comment --comment "kubernetes postrouting rules " -j KUBE-POSTROUTING
```

如图 3-7 所示，KUBE-SERVICE 作为整个反向代理的入口链，KUBE-SVC-XXX 为具体某一服务的入口链，KUBE-SERVICE 链会根据具体的服务 IP 跳转至具体的 KUBE-SVC-XXX 链，然后 KUBE-SVC-XXX 链再根据一定的负载均衡算法跳转至 Endpoint（某一个具体的 Pod 地址和端口）。

:::center
  ![](../assets/custom-chain.png)<br/>
  图 3-7 kube-proxy 通过 iptables 自定义链实现 Service 功能
:::

## 3. iptables 性能问题

Kubernetes 中 kube-proxy 组件有两种模式 iptables 和 IPVS，两者区别如下：

- iptables 的规则匹配是线性的，匹配的时间复杂度是 O(N)，规则更新是非增量式的，哪怕增加/删除一条规则，也是修改整体的 iptables 规则表，当集群内 Service 数量较多，会有不小的性能影响；
- IPVS 专门用于高性能负载均衡，使用了更高效的哈希表，时间复杂度为 O(1)，性能与规模无关。

如图 3-9 所示的基准测试，当 1,000 个服务（10,000 个 Pod）以上时，这两个模式的性能表现产生明显差异。

:::center
  ![](../assets/iptables-vs-ipvs.png)<br/>
  图 3-9 iptables 与 IPVS 的性能差异 [图片来源](https://www.tigera.io/blog/comparing-kube-proxy-modes-iptables-or-ipvs/)
:::

所以，当 Kubernetes 规模较大时，应该避免使用 iptables 模式。如果 CNI 插件使用的是 Cilium，还可以创建一个没有 kube-proxy 的 Kubernetes 集群，减少 iptables/netfilter 的影响，全方位提升网络性能。 
