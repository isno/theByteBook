# 3.4 DNS服务高可用保障

Meta（Facebook 公司的更名）在2021年10月时发生过一次严重的宕机故障，故障绕过了所有的高活设计，让 Meta 下 facebook、instagram、whatsapp  等众多服务出现了长达接近 7 个小时宕机，影响范围之广以至于差点产生严重二次故障，搞崩半个互联网。

Meta 官方在故障后续发布原因总结是：**运维人员发布 BGP 通告时，误将 Meta AS32934 自治域内的 DNS NameServer 给删除了**。直接后果就是所有请求 Facebook 域名的解析请求都会丢弃在 Meta 边界路由器上，世界各地 DNS 解析器都无法再解析 Facebook 的域名。

故障时期，使用 dig 查询 Facebook 域名解析全部出现 SERVFAIL 错误。

```
➜  ~ dig @1.1.1.1 facebook.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;facebook.com.            IN    A
➜  ~ dig @8.8.8.8 facebook.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;facebook.com.            IN    A
```

因为 Facebook 用户太多了，用户无法正常登陆 APP 时会疯狂地发起重试，CloudFlare 的DNS服务器（1.1.1.1）请求解析瞬间增大了 30 倍，差点引起连锁反应，所幸 1.1.1.1 在当时的情况下顶住了压力，如果也造成 1.1.1.1 宕机，恐怕整个互联网会出现相当时间不可用。

<div  align="center">
	<img src="../assets/cloudflare-dns.png" width = "450"  align=center />
</div>

## 1. 故障总结

这次故障实际上 BGP 和 DNS 一系列设计缺陷叠加，从而放大了故障影响。BGP 发布了错误路由，恰巧 Meta 权威域名解析服务器IP 包含在这部分路由中，这就导致域名解析请求无法路由到 Meta 内部的服务器中。另外由于 DNS 出现问题，运维人员基本无法再通过远程的方式修复路由，而机房维护人员没有权限、也没能力去解决这个问题，只能是修复团队紧急`打飞的` 跑到数据中心修复，这就是此次故障范围、时长影响巨大的原因。

Meta 这次故障带给我们的经验是 DNS 服务设计时，尽量避免采用单一化架构和技术，应从部署形式和部署位置等层面考虑技术多元性。

在部署设计上可选择将 DNS 服务器节点全部放在 SLB 后方，或采用 OSPF Anycast 架构等部署形式，从而提高DNS系统的可靠性。在部署位置设计上可选择数据中心自建集群+公有云服务混合异构部署，利用云的分布式优势进一步增强 DNS系统健壮性，同时提升 DNS 系统在遭受 DDoS 攻击时的抵御能力。

如下图所示，亚马逊 amazon.com 的权威域授权体系肯定要优于facebook.com （包括不同的AS域），所以它的抗风险能力肯要强于Facebook。

<div  align="center">
	<img src="../assets/dns-1.png" width = "220"  align=center />
</div>

<div  align="center">
	<img src="../assets/dns-2.png" width = "350"  align=center />
</div>

## 2. 核心功能运维操作

一些关键的运维维护是有很大风险的。例如更改 BGP 通告、修改路由策略、修改防火墙策略等。此类的操作如果产生失误，大概率会造成远程连接无法再使用，这个时候想远程修复就难了，只能接近物理机才有方法。

对于这种在生产环境中很大风险性的操作，可以引用一种个二次提交的策略。例如，修改一个 iptables 规则，修改之后引入 10 分钟`观察期`，观察期结束后，系统自动恢复原来的配置，防止配置失败导致运维人员无法连接。运维人员确认观察期内流量、规则没有任何问题之后，再执行正式的操作。