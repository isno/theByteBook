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



我们扩充一下图1. 一个 IP 包经过 iptables 的处理流程如下

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

**iptables 规则用法**

iptables可以有效地对特定的网络数据包进行管理，但当需要配置大量的网络规则时，会出现管理和维护不够方便的情况。

ipset是iptables的扩展，支持集合增量更新、动态修改、规则有效时间、通配符等功能，可以帮助用户更好的配置和管理iptables。

云服务商提供的安全组 `security group` 也能提供类似的功能，不过 `iptables` 在服务器内，而`security group`在服务器外。
```
配置网段规则
$ ipset create net_blacklist hash:net
$ ipset add net_blacklist 1.1.0.0/16
$ ipset create net_whitelist hash:net
$ ipset add net_whitelist 2.2.0.0/16

配置 ip + port 规则
$ ipset create ip_port_blacklist hash:ip,port
$ ipset add ip_port_blacklist 1.1.1.1,100-200
$ ipset add ip_port_blacklist 8.8.8.8,udp:88 
$ ipset add ip_port_blacklist 88.88.88.88,80 
$ ipset del ip_port_blacklist 1.1.1.1,100-200

配置ip规则
$ ipset create ip_blacklist hash:ip
$ ipset add ip_blacklist 192.168.1.1
$ ipset add ip_blacklist 192.168.1.2

配置port规则
$ ipset create port_whitelist bitmap:port range 0-65535
$ ipset add port_whitelist 80
$ ipset add port_whitelist 8080

启用五条规则：网段黑名单，网段白名单，ip + port黑名单，ip黑名单，端口白名单
$ iptables -I INPUT -m set --match-set net_blacklist src -j DROP 
$ iptables -I INPUT -m set --match-set net_whitelist src -j ACCEPT 
$ iptables -I INPUT -m set --match-set ip_port_blacklist src -j DROP 
$ iptables -I INPUT -m set --match-set ip_blacklist src -j DROP 
$ iptables -I INPUT -m set --match-set port_whitelist src -j ACCEPT

删除iptables规则
$ iptables -nL --line-number # 查看iptables rule number
$ iptables -D <chain name> <rule number> # 根据chain name 和 iptables rule number删除规则
$ iptables -flush INPUT # 删除INPUT chain的全部规则

删除ipset规则
ipset destroy net_blacklist
ipset destroy net_whitelist
ipset destroy ip_port_blacklist
ipset destroy ip_blacklist
ipset destroy port_whitelist
```
更多灵活用法请参考: `iptables --help` `man iptables` `ipset --help` `man ipset` 

## iptables 更新延迟的问题

由于每条规则长度不等、内部结构复杂，且同一规则集位于连续的内存空间，iptables 使用全量替换的方式来更新规则，这使得我们能够从用户空间以原子操作来添加/删除规则，但非增量式的规则更新会在规则数量级较大时带来严重的性能问题。

假如在一个大规模 Kubernetes 集群中使用 iptables 实现 Kube-Proxy，当 service 数量较多时，哪怕更新一个 service 也会整体修改 iptables 规则表。全量提交的过程会 kernel lock 进行保护，因此会有很大的更新时延。

当 service 数量较多时，可以尝试在 Kubernetes 集群中使用基于 ipset 的 ipvs 实现 Kube-Proxy， 采用增量更新的方式保证service提供更加稳定的服务。


