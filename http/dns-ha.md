# 2.3.3 Facebook故障分析和总结

Facebook的故障有必要总结复盘，在这一节我们了解故障的原因以及给我们的警醒。

Facebook此次故障发生在2021年10月，故障绕过了所有的高可用设计。故障期间facebook、instagram、whatsapp 等众多服务出现了长达接近 7 个小时宕机，影响范围之广以至于差点产生严重二次故障，搞崩整个互联网。

遇到如此大规模的瘫痪不是DNS就是BGP出了问题。但是很抱歉，这次是两个一起出了问题。

<div  align="center">
	<img src="../assets/facebook-404-error.jpeg" width = "450"  align=center />
	<p>图 2-4 Facebook宕机 </p>
</div>

Facebook官方在故障后续发布原因总结是：**运维人员修改BGP路由规则时，误将Facebook的AS32934（Autonomous System，自治域）内的 Authoritative nameserver 给删除了**。这个操作的直接后果就是所有请求 Facebook 域名的解析请求都会丢弃在网络路由中，世界各地 DNS 解析器都无法再解析 Facebook 域名。


## 1.故障现象

故障时期，使用 dig 查询 Facebook 域名解析全部出现 SERVFAIL 错误，根据我们前面的结论，这是Authoritative nameserver出现了故障。

```
➜  ~ dig @1.1.1.1 facebook.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;facebook.com.            IN    A
➜  ~ dig @8.8.8.8 facebook.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;facebook.com.            IN    A
```

因为Facebook 用户太多了，用户无法正常登陆 APP 时会疯狂地发起重试。CloudFlare的DNS解析器（1.1.1.1）请求瞬间增大了30倍，如果1.1.1.1宕机，恐怕整个互联网会出现相当一段时间不可用。

<div  align="center">
	<img src="../assets/cloudflare-dns.png" width = "650"  align=center />
	<p>图 2-5 cloudflare 监控到 Facebook 故障时期的请求数 </p>
</div>

故障从美国东部标准时间上午11点51分开始，最终六个小时以后才恢复。

## 2.故障总结

这次故障实际上 BGP 和 DNS 一系列设计缺陷叠加，从而放大了故障影响。BGP 发布了错误路由，恰巧Facebook权威域名解析服务器IP 包含在这部分路由中，这就导致域名解析请求无法路由到Facebook内部的Authoritative nameserver服务器中。由于DNS出现问题，运维人员基本无法再通过远程的方式修复，只能是修复团队紧急跑到数据中心修复，这就是此次故障范围、时长影响巨大的原因。

Facebook这次故障带给以下几点考虑：

- 部署形式考虑：可选择将 DNS 服务器节点全部放在 SLB（Server Load Balancer，负载均衡）后方，或采用 OSPF Anycast 架构等部署形式，从而提高 DNS 系统的可靠性。
- 部署位置考虑：可选择数据中心自建集群 + 公有云服务混合异构部署，利用云的分布式优势进一步增强 DNS 系统健壮性，同时提升 DNS 系统在遭受 DDoS 攻击时的抵御能力。

如图2-6展示了亚马逊 amazon.com 和 facebook.com 的权威域体系对比，amazon.com 的 Authoritative nameserver 分散在不同的 AS 内，所以它的抗风险能力肯要强于 Facebook。

<div  align="center">
	<img src="../assets/dns-1.png" width = "220"  align=center />
</div>
<div  align="center">
	<img src="../assets/dns-2.png" width = "350"  align=center />
	<p>图 2-6  amazon.com 与 facebook.com 域名结构对比</p>
</div>


## 3.运维操作的警示

一些关键的运维操作具有很大风险，例如更改 BGP 通告、修改路由策略、修改防火墙策略等。此类的操作如果产生失误，有可能造成远程连接无法再使用，这个时候想远程修复就难了，只能接近物理机才能处理。

对于这种在生产环境中很大风险性的操作，可以引用一种个二次提交的策略。例如，修改一个 iptables 规则，修改之后引入 10 分钟`观察期`，观察期结束后，系统自动恢复原来的配置。运维人员确认观察期内流量、规则没有任何问题之后，再执行正式的操作。