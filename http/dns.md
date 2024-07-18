# 2.3 域名解析的原理与实践


DNS（Domain Name System，域名系统）是互联网中最重要的基础设施，它的主要职责是实现域名的解析，也就是将域名转换为 IP 地址。

2021 年期间互联网发生了几起影响颇大的服务宕机事件，故障的原因均与 DNS 系统有关：
- 7 月22 日，技术服务商 Aakamai 的 Edge DNS 服务故障，造成 PlayStation Network、HBO、UPS、Airbnb、Salesforce 等众多知名网站宕机[^1]；
- 不久之后的 10 月 4 日，社交网络平台 Facebook 及旗下服务 Messenger、Instagram、WhatsApp、Mapillary 与 Oculus 发生全球性宕机[^2]。

为什么这些故障的影响会如此广泛？为了解答这个问题，这一节我们来了解域名解析的基本原理，顺便学习域名解析故障时如何排查问题。

## 2.3.1 域名解析的原理

分析域名解析的过程之前，我们先了解域名的组成结构。

如图 2-2 所示，域名是一种树状结构，最顶层的域名是根域名（注意是一个点“.”，它是 .root 的含义，不过现在“.root”已经默认被隐藏），然后是顶级域名（top-level domain，简写 TLD，例如 .com），再是二级域名（例如 google.com）。

:::center
  ![](../assets/dns-tree.webp)<br/>
  图 2-2 域名树状结构
:::

域名的解析过程，其实就是从域名树的根部到顶部，不断递归查询的过程。整个解析过程可以归纳为如图 2-3。

:::center
  ![](../assets/dns-example.png)<br/>
  图 2-3 域名解析过程
:::

- 首先，第 1 步用户向“DNS 解析器”（Recursive resolver，例如电信运营商的 114.114.114.114）发出解析 thebyte.con.cn 域名请求。
- “DNS 解析器” 判断是否存在解析缓存，存在直接返回缓存的结果，也就是直接执行第 8 步。
- 如不存在缓存，执行第 2 步则向就近的“根域名服务器”（Root nameserver）查询域名所属“TLD 域名服务器”（TLD nameserver）（TLD 域名服务器维护着域名托管、权威域名服务器等信息）。值得一提的是，互联网有些文章说“根域名服务器”只有 13 台，实际上“根域名服务器”的数量远不止 13 台，截止 2024 年 7 月，全世界共有 1,845 台根域名服务器[^3]。
- 有了 com.cn. 的“TLD 域名服务器”的信息后，执行第 4 步，向 “TLD 域名服务器” 查询 thebyte.com.cn. 的“权威域名服务器”（Authoritative nameserver，它维护域名的解析记录）。
- 有了 thebyte.com.cn 的“权威域名服务器”信息后，执行第 6 步，向“权威域名服务器”查询域名的解析记录，
- “DNS 解析器” 获取到解析记录后，再转发给客户端，整个解析过程结束。 

回顾整个流程，有 2 个环节容易发生问题：
- “DNS 解析器”是客户端与“权威域名服务器”的中间人，容易出现解析污染或者“DNS 解析器”宕机，这种情况会导致**域名解析局部不可用**；
- “权威域名服务器”出现故障，这种情况会导致**域名解析全局不可用**，但出现故障的概率极低。

下面我们继续看看如果 DNS 解析出现故障了该如何排查。

## 2.3.2 域名解析故障时排查

如果请求一个 HTTPS 接口，出现服务不可用、Unknown host 等错误时，除了用 ping 测试连通性外，我们可以用 nslookup 或者 dig 命令确认域名解析是否出现问题。

先看 nslookup 命令，该命令可用于查询域名的解析结果，判断域名解析是否正常。nslookup 命令示例：
```bash
$ nslookup thebyte.com.cn        
Server:		8.8.8.8
Address:	8.8.8.8#53

Non-authoritative answer:
Name:	thebyte.com.cn
Address: 110.40.229.45
```
上述的返回信息说明：

- 第一段的 Server 为当前使用的“DNS 解析器”，上面的结果显示是 Google 的 8.8.8.8 服务器。
- 第二段的 Non-authoritative answer 意思是：因为“DNS 解析器”是转发“权威域名服务器”的记录，所以解析结果为非权威应答。最后一行是 thebyte.com.cn 解析结果，可以看到是 110.40.229.45。

nslookup 返回的结果比较简单，但从中可以看出用的哪个“DNS 解析器”，域名的解析是否正常。

实际上，“DNS 解析器”也经常出现问题，这时候再使用 nslookup 命令就不行了。

当怀疑系统默认的“DNS 解析器”异常时，我们可以使用 dig 命令，并通过参数切换到另外一个 “DNS 解析器”。如下代码所示，指定使用 8.8.8.8 查询 thebyte.com.cn 的解析记录。

```bash
$ dig @8.8.8.8 thebyte.com.cn

; <<>> DiG 9.10.6 <<>> thebyte.com.cn
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 63697
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;thebyte.com.cn.			IN	A

;; ANSWER SECTION:
thebyte.com.cn.		599	IN	A	110.40.229.45

;; Query time: 14 msec
;; SERVER: 8.8.8.8#53(8.8.8.8)
;; WHEN: Fri May 12 15:22:33 CST 2023
;; MSG SIZE  rcvd: 59
```

上述的返回信息说明：
- 第一段 opcode 为 QUERY，表示执行查询操作，status 为 NOERROR，表示解析成功。
- 第二段 QUESTION SECTION 部分显示了发起的 DNS 请求参数，A 表示我们默认查询 A 类型记录。
- 第三段 ANSWER SECTION 部分为 DNS 查询结果，可以看到 thebyte.com.cn. 的解析结果为 110.40.229.45。
- 最后一段为查询所用的“DNS 解析器”、域名解析的耗时等信息。

Facebook 2021 年 10 月发生了一起重大的宕机故障，当时使用 dig 排查各个公共“DNS 解析器”，全部出现 SERVFAIL 错误，这说明是“权威域名服务器”出现了问题。

```bash
➜  ~ dig @1.1.1.1 facebook.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;facebook.com.            IN    A
➜  ~ dig @1.1.1.1 whatsapp.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;whatsapp.com.            IN    A
..
```

下一节，笔者以 Facebook 2021 年的宕机事件为例，说明当“权威域名服务器”出现故障时会是什么影响。


[^1]: 参见 https://www.akamai.com/blog/news/akamai-summarizes-service-disruption-resolved
[^2]: 参见 https://en.wikipedia.org/wiki/2021_Facebook_outage
[^3]: 根域名服务器的信息请参见 https://root-servers.org/
