# 2.3.1 Facebook 故障分析总结

Facebook 史诗级故障事件发生在 2021 年 10 月 4 日，故障绕过了所有的高可用设计，让 Facebook 公司旗下的 Facebook、Instagram、WhatsApp 等众多服务出现了长达接近 7 个小时宕机，影响范围之深以至于差点产生严重二次故障，搞崩整个互联网。

如此大规模服务的瘫痪不是 DNS 就是 BGP 出了问题。这次，Facebook 很倒霉，两个一起出现了问题。

<div  align="center">
	<img src="../assets/facebook-404-error.jpeg" width = "450"  align=center />
	<p>图 2-4 Facebook宕机 </p>
</div>

Facebook 官方在故障后续发布原因总结是：
:::tip <a/>
运维人员修改 BGP 路由规则时，误将 Facebook 的自治域 AS32934 [^1]内的“权威域名服务器”的路由给删除了。
:::

这个操作的直接后果是所有请求 Facebook 域名的解析请求都会丢弃在网络中，世界各地“DNS 解析器”全部无法正常解析 Facebook 相关的域名。

## 1.故障现象

故障期间使用 dig 查询 Facebook 域名解析全部出现 SERVFAIL 错误，根据我们前面的结论，这是“权威解析服务器”出现了故障。

那故障影响范围就大了，世界上所有的“DNS 解析器”都不会再正常返回 Facebook 域名的解析结果。

```bash
➜  ~ dig @1.1.1.1 facebook.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;facebook.com.            IN    A
➜  ~ dig @8.8.8.8 facebook.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;facebook.com.            IN    A
```

故障还影响到 Facebook 内部，邮箱无法打开、门禁无法... Facebook 从外到内完全停摆。据 Facebook 员工回忆当天的情形“ 今天大家都很尴尬，不知道发生了什么，也不知道该做什么，只好假装什么都没有发生”。

因为 Facebook 用户太多了，用户无法正常登陆 APP 时会疯狂地发起重试。如图 2-5 所示，技术服务商 Cloudflare 的 DNS 解析器（1.1.1.1）请求瞬间增大了 30 倍，如果 1.1.1.1 宕机，恐怕整个互联网都会受到影响。

<div  align="center">
	<img src="../assets/cloudflare-dns.png" width = "650"  align=center />
	<p>图 2-5 Cloudflare 的域名解析服务器 1.1.1.1 在 Facebook 故障时请求瞬间增大 30 倍 </p>
</div>

故障从美国东部标准时间上午 11 点 51 分开始，最终 6 个小时以后才恢复。

## 2.故障总结

这次故障实际上 Facebook BGP 路由系统和 DNS 系统一系列设计缺陷叠加，从而放大了故障影响：

- 运维人员发布了错误的 BGP 路由公告；
- 恰巧 Facebook 的权威域名服务器的 IP 包含在这部分路由中。

这就导致域名解析请求无法路由到 Facebook 内部网络中。

且因为是 DNS 出现问题，运维人员也受故障影响，很难再通过远程的方式修复，修复团队只能是紧急跑到数据中心修复（道听途说打了“飞的”过去）。

Facebook 这次故障带给我们以下关于 DNS 系统设计的思考：

- **部署形式考虑**：可选择将“权威域名服务器”全部放在 SLB（Server Load Balancer，负载均衡）后方，或采用 OSPF Anycast 架构[^2]等部署形式，从而提高 DNS 系统的可靠性。
- **部署位置考虑**：可选择数据中心自建集群 + 公有云服务混合异构部署，利用云的分布式优势进一步增强 DNS 系统健壮性，同时提升 DNS 系统在遭受 DDoS 攻击时的抵御能力。

如图 2-6 所示，amazon.com 和 facebook.com 的权威域体系对比：amazon.com 的权威解析服务器有多套不同的地址，分散在不同的 TLD 域名服务器内，所以它的抗风险能力肯要强于 Facebook。

<div  align="center">
	<img src="../assets/dns-1.png" width = "220"  align=center />
</div>
<div  align="center">
	<img src="../assets/dns-2.png" width = "350"  align=center />
	<p>图 2-6  amazon.com 与 facebook.com 域名体系对比</p>
</div>

## 3.运维操作的警示

一些关键的运维操作具有很大风险，例如更改 BGP 通告、修改路由、修改防火墙策略等。

这类的操作如果产生失误，有可能造成远程连接无法再使用，这个时候想远程修复就难了，只能接近物理机才能处理。

这对我们的思考是，如果生产环境中存在很大风险性的操作，是修改操作确认两遍，如果是删除操作，那就确认三遍。除了祈祷手稳之外，规范的方式是使用类似二次提交的策略，例如修改一个 iptables 规则，修改之后增加 10 分钟“观察期”。观察期结束后，系统自动恢复原来的配置，运维人员确认观察期内数据没有任何问题之后，再执行正式的操作。

[^1]: AS（Autonomous System，自治域）是具有统一路由策略的巨型网络或网络群组。各个开放的 AS 连接起来就成了互联网。连接到互联网的每台计算机或设备都需要连接到一个 AS。
[^2]: OSPF Anycast 是一种网络服务部署技术，它通过借助于动态路由协议实现服务的负载均衡和冗余，提高了服务的可用性和效率。 在 OSPF Anycast 中，一个目标地址可以分配给多个接口，每个接口连接一个服务器节点。当客户端访问该目标地址时，数据包会被发送到最近的服务器节点，从而实现负载均衡和冗余备份。

