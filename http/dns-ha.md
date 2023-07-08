# 3.4 DNS服务高可用保障

Meta 在 2021年10月 发生过一次严重的宕机事故，这次事故绕过了所有的高活设计，让 Meta 下 facebook、instagram、whatsapp等众多服务出现了长达接近7个小时宕机，影响的范围之广以至于差点产生严重的二次故障，搞崩半个互联网。

Meta官方 在故障后续发布原因总结：**调度数据中心之间网络流量的骨干路由器配置更改导致边界网关协议撤销了Facebook自治域AS32934下包含Facebook域名服务器IP的IP地址块，抹去了Facebook需要的DNS路由信息**。

BGP 撤销 DNS权威服务器IP 导致所有的数据包都会丢弃在FB的边界路由器上，作为直接后果，世界各地的所有 DNS 解析器都停止解析它们的域名。

当时的运维人员使用 dig 查询 各个公共 DNS服务器解析 Facebook相关的域名， 全部出现 SERVFAIL 错误。

```
➜  ~ dig @1.1.1.1 facebook.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;facebook.com.            IN    A
➜  ~ dig @1.1.1.1 whatsapp.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;whatsapp.com.            IN    A
➜  ~ dig @8.8.8.8 facebook.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;facebook.com.            IN    A
➜  ~ dig @8.8.8.8 whatsapp.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;whatsapp.com.            IN    A
```

进一步出现的连锁反应是：由于无法连接Meta的DNS权威服务器，1.1.1.1、8.8.8.8 等各个主要的公共 DNS 解析器都开始发布（或缓存）SERVFAIL 响应。

当时 CloudFlare DNS服务监测到， 因为 Facebook 用户太多了，用户无法正常登陆 APP 时会疯狂地发起重试，CloudFlare的DNS服务器请求解析瞬间增大了30倍，差点引起连锁反应，把整个互联网搞崩。

所幸 1.1.1.1 在当时的情况下顶住了压力，如果也造成 1.1.1.1 宕机，恐怕整个互联网会出现相当时间的不可用。

<div  align="center">
	<img src="../assets/cloudflare-dns.png" width = "450"  align=center />
</div>

## 1. 故障总结

通过对故障的回溯分析，这次故障实际上 BGP 和 DNS 的一系列巧合操作造成了此次事件的严重后果， BGP发布了错误的路由，恰巧 Meta 权威域名解析服务器IP的地址也包含在这部分路由中， 这导致 网络域名解析 IP包 无法路由到 Meta 内部的服务器中。

由于 DNS 出现问题，运维人员 基本无法再通过远程的方式修复路由，而机房的维护人员没有权限，也没有储备相关的知识去解决这个问题，只能是修复团队紧急“打飞的” 到加州的主数据中心参与维修。

这就是此次故障范围、时长影响巨大的原因。


DNS 本质是一个分布式的数据库，这种结构允许对整体数据库的各个部分进行本地控制且互相关联。如下图所示，亚马逊 amazon.com 的权威域授权体系肯定要优于facebook.com （包括不同的AS域），所以它的抗风险能力肯要强于Facebook。

<div  align="center">
	<img src="../assets/dns-1.png" width = "220"  align=center />
</div>

<div  align="center">
	<img src="../assets/dns-2.png" width = "350"  align=center />
</div>


Meta这次故障带给我们的经验是：DNS系统在架构设计和技术路线选择时要尽量避免采用单一化架构和技术，应从部署形式和部署位置等层面考虑技术多元性。

在部署形式的设计上可选择将DNS服务器节点全部放在SLB（应用负载）后方，或采用 OSPF Anycast架构等部署形式，提高DNS系统的可靠性。

在部署位置的设计上可选择数据中心自建集群+公有云服务混合异构部署，利用云的分布式优势进一步增强DNS系统的健壮性，同时提升DNS系统在遭受DDoS攻击时的抵御能力。


## 2. 核心功能运维操作

一些关键的运维维护实际上是由很大风险，比如更改BGP通告，修改内网的路由、修改本机的防火墙策略等等，严重地失误直接将造成远程连接无法再使用，这个时候想远程修复就难了，只能接近 物理机才有方法。

对于这种在生产环境中很大风险性的操作，可以引用一种个二次提交的策略：

比如修改一个 iptables 规则，修改之后引入10分钟的“观察期”，在观察期后，系统内部再自动恢复 原来的配置，防止配置失败，运维人员连接不上远程机。运维人员确 观察期内流量、规则没有任何问题之后，再执行正式的操作。