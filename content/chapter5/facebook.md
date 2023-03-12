# Meta 宕机故障分析

Meta 2021年10月的故障更像一种对运维的降维打击。

这次故障绕过了所有的高活设计，让 Meta 下 facebook、instagram、whatsapp等众多服务出现了长达接近7个小时宕机，世界各地的用户纷纷跑向 Twitter 询问发生了什么？

影响的范围之广以至于差点产生严重的二次故障，搞崩整个互联网。

到底是什么问题导致 Meta 出现如此影响范围大、故障持续时间长的宕机？

Meta官方 在故障的后续也发布故障总结，同时互联网各大服务商也发布了从它们角度对故障的观察和分析，笔者整理了一部分文章，让我们一起回顾Meta的故障，以及总结对我们的启示。

## 事故现象

北京时间 2021年 10月4日 23:50，世界各地的用户发现 Facebook 应用无法连接了，当然不止 Facebook 无法使用，Meta 公司旗下所有网站及应用，包括facebook、instagram、whatsapp等都出现了网络无法连接的严重事故。

除了外界用户的无法访问外，Meta 企业内部服务业也出现了宕机不可用，内部通讯、邮件等等，员工只能临时纷纷寻找第三方替代的服务。

系统修复后 Meta 自己以及各大检测平台CloudFlare、ThousandEye、Downdetector等各自从内部、外部视角对事故原因都进行了观察和总结。

## 事故分析

在当日北京时间 23:40 左右, ThousandEye 监控到 Facebook 应用出现 DNS 失效的情况，继而出现 DNS 权威解释服务器不可达的情况：

<div  align="center">
	<img src="/assets/chapter5/ThousandEye.png" width = "500"  align=center />
</div>

笔者在 第二章介绍过DNS的流程，当本地 DNS 缓存失效后，会向权威解释服务器解析域名，当权威服务器不可达，那意味着所有 HTTP相关的解析请求都会出现问题。

如果当时我们在现场，可以使用 nslookup以及dig 配合查询 facebook.com 的解析, Server 为 Local DNS， Non-authoritative answer 则为 域名的解析 为 缓存的结果

```
isno@isnodeMacBook-Pro ~ % nslookup www.facebook.com
Server:		8.8.8.8
Address:	8.8.8.8#53

Non-authoritative answer:
www.facebook.com	canonical name = star-mini.c10r.facebook.com.
Name:	star-mini.c10r.facebook.com
Address: 31.13.75.35
```


当时，Cloudflare 也观察到这个错误，以为是自己的 DNS 解析服务(1.1.1.1) 出现故障, 继而开始紧急分析故障，他们在日志中发现 23:40 左右，Meta的 AS 自治域 向外发送了大量的 BGP 更新。

<div  align="center">
	<img src="/assets/chapter5/image4-11-1.png" width = "600"  align=center />
</div>

进一步分析BGP消息发现了大量路由撤销，包含了 Meta DNS 权威服务器的路由: 

这期间 Meta BGP Prefix数量由129个减少103个，这26个Prefix包含了 5,888个IP。

Meta 有4个权威 DNS 服务器，分别是 a.ns.facebook.com（129.134.30.12）、b.ns.facebook.com（129.134.31.12）、c.ns.facebook.com（185.89.218.12）和d.ns.facebook.com（185.89.219.12）。 非常不巧，这四个 DNS权威服务器IP都在丢失的IP块中。

<div  align="center">
	<img src="/assets/chapter5/bgp-prefix.png" width = "600"  align=center />
</div>

在Meta的故障公告中是这样的说话： 调度数据中心之间网络流量的骨干路由器配置更改导致边界网关协议撤销了Facebook自治域AS32934下包含Facebook域名服务器IP的IP地址块，抹去了Facebook需要的DNS路由信息。

BGP 撤销 DNS权威服务器IP 导致所有的数据包都会丢弃在FB的边界路由器上，作为直接后果，世界各地的所有 DNS 解析器都停止解析它们的域名。

当时的运维人员使用 dig 查询 各个公共 DNS服务器解析 Facebook相关的域名， 全部出现 SERVFAIL 错误。
```
➜  ~ dig @1.1.1.1 facebook.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;facebook.com.			IN	A
➜  ~ dig @1.1.1.1 whatsapp.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;whatsapp.com.			IN	A
➜  ~ dig @8.8.8.8 facebook.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;facebook.com.			IN	A
➜  ~ dig @8.8.8.8 whatsapp.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;whatsapp.com.			IN	A
```

进一步出现的连锁反应是：由于无法连接Meta的DNS权威服务器，1.1.1.1、8.8.8.8 等各个主要的公共 DNS 解析器都开始发布（或缓存）SERVFAIL 响应。

当时 CloudFlare DNS服务监测到， 因为 Facebook 用户太多了，用户无法正常登陆 APP 时会疯狂地发起重试，CloudFlare的DNS服务器请求解析瞬间增大了30倍，差点引起连锁反应，把整个互联网搞崩。

所幸 1.1.1.1 在当时的情况下顶住了压力，如果也造成 1.1.1.1 宕机，恐怕整个互联网会出现相当时间的不可用。

<div  align="center">
	<img src="/assets/chapter5/image6-9-1.png" width = "700"  align=center />
</div>

除了专业的互联网服务商收到的影响，由于Facebook的整个服务全部无法使用，全世界的用户都迫切地想知道答案，纷纷跑到 Twitter、Signal 等社交平台，导致 这些服务的 DNS 查询也大大增加。

<div  align="center">
	<img src="/assets/chapter5/image1-12-1.png" width = "700"  align=center />
</div>

### 故障恢复 

在第二天的凌晨 5点 左右，CloudFlare 开始观察到 Meta的 BGP 开始通告部分路由，10分钟之后出现大量的路由通告，Meta相关的DNS权威服务器也开始正常服务， 经过几个小时后 Meta的流量基本恢复，世界各地的用户也开始正常使用Facebook。 

<div  align="center">
	<img src="/assets/chapter5/unnamed-3-3-1.png" width = "700"  align=center />
</div>

再使用 dig 查询 DNS的解析情况，看到 DNS 解析已经正常了
```
isno@isnodeMacBook-Pro ~ % dig @1.1.1.1 facebook.com

; <<>> DiG 9.10.6 <<>> @1.1.1.1 facebook.com
; (1 server found)
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 49296
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 0

;; QUESTION SECTION:
;facebook.com.			IN	A

;; ANSWER SECTION:
facebook.com.		67	IN	A	128.242.245.93

;; Query time: 76 msec
;; SERVER: 1.1.1.1#53(1.1.1.1)
;; WHEN: Thu Feb 02 16:56:02 CST 2023
;; MSG SIZE  rcvd: 46
```

## 故障总结

通过对故障的回溯分析，这次故障实际上 BGP 和 DNS 的一系列巧合操作造成了此次事件的严重后果， BGP发布了错误的路由，恰巧 Meta 权威域名解析服务器IP的地址也包含在这部分路由中， 这导致 网络域名解析 IP包 无法路由到 Meta 内部的服务器中。

由于 DNS 出现问题，运维人员 基本无法再通过远程的方式修复路由，而机房的维护人员没有权限，也没有储备相关的知识去解决这个问题，只能是修复团队紧急“打飞的” 到加州的主数据中心参与维修。

这就是此次故障范围、时长影响巨大的原因。

### BGP的问题

对于这次故障，我想有几个技术需要思考：BGP协议、DNS的可用性、以及运维人员重大操作的保障措施。

第一个是BGP， 实际上BGP带来的重大事故已经不止一次发生了，2017年由于Google BGP错误公告，导致了日本互联网长时间的瘫痪。

BGP作为整个互联网的基石，其协议已经使用了30年之久，随着互联网的发展，BGP 和 TCP 耦合的问题导致 BGP 通信过程收敛缓慢、4Byte-ASN和IPv4地址交易带了路由前缀大量更新、BGP FlowSpec 使得协议栈越来越复杂 等等问题

<div  align="center">
	<img src="/assets/chapter5/tcp-bgp.png" width = "500"  align=center />
</div>

### DNS的问题

DNS本质是一个分布式的数据库，这种结构允许对整体数据库的各个部分进行本地控制且互相关联。如下图所示，亚马逊 amazon.com 的权威域授权体系肯定要优于facebook.com （包括不同的AS域），所以它的抗风险能力肯要强于Facebook。

<div  align="center">
	<p> DNS 层次 </p>
	<img src="/assets/chapter5/dns.png" width = "260"  align=center /> <br/>
</div>
<div  align="center">
	<p> DNS  权威服务器列表 </p>
	<img src="/assets/chapter5/dns-2.png" width = "400"  align=center />
</div>

Meta这次故障带给我们的经验是：DNS系统在架构设计和技术路线选择时要尽量避免采用单一化架构和技术，应从部署形式和部署位置等层面考虑技术多元性。

在部署形式的设计上可选择将DNS服务器节点全部放在SLB（应用负载）后方，或采用 OSPF Anycast架构等部署形式，提高DNS系统的可靠性。

在部署位置的设计上可选择数据中心自建集群+公有云服务混合异构部署，利用云的分布式优势进一步增强DNS系统的健壮性，同时提升DNS系统在遭受DDoS攻击时的抵御能力。

### 运维操作的问题

一些关键的运维维护实际上是由很大风险，比如更改BGP通告，修改内网的路由、修改本机的防火墙策略等等，严重地失误直接将造成远程连接无法再使用，这个时候想远程修复就难了，只能接近 物理机才有方法。

对于这种在生产环境中很大风险性的操作，可以引用一种个二次提交的策略： 

比如修改一个 iptables 规则，修改之后引入10分钟的“观察期”，在观察期后，系统内部再自动恢复 原来的配置，防止配置失败，运维人员连接不上远程机。运维人员确 观察期内流量、规则没有任何问题之后，再执行正式的操作。
