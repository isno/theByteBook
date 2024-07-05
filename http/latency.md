# 2.2 HTTPS 请求阶段分析

着手优化之前，我们得先清楚一个 HTTPS 请求有哪些阶段，以及各个阶段耗时如何计算。

## 2.2.1 请求阶段分析

一个完整、无任何缓存、未复用连接的 HTTPS 请求需要经过以下 5 个阶段：**DNS 域名解析、TCP 握手、SSL 握手、服务器处理、内容传输**。

如图 2-1 请求阶段分析所示，这些阶段共需要 4 个 RTT[^2] = 1 RTT（DNS Lookup，域名解析）+ 1 RTT（TCP Handshark，TCP 握手）+ 2 RTT（SSL Handshark，SSL 握手）+ 1 RTT（Data Transfer，HTTP 内容请求传输）。

:::center
  ![](../assets/http-process.png)<br/>
  图 2-1 HTTPS（使用 TLS1.2 协议）请求阶段分析 [图片来源](https://blog.cloudflare.com/a-question-of-timing)
:::

RTT 是评估服务延迟的重要因素。举个例子，假设北京到美国洛杉矶的 RTT 延迟为 190 毫秒，从北京访问美国洛杉矶 HTTP 服务时延就是`5*190+后端业务时延（ms）`，“5”代表的是 HTTPS 请求的 5 个 RTT。

因为 RTT 网络延受到物理环境制约，使用纯粹的技术手段很难突破 950ms 指标。所以，这也指导我们优化策略以减少请求环节、链路优化、降低 SSL 计算量为主。

## 2.2.2 各阶段耗时分析

HTTPS 请求的各个阶段可以使用 curl 工具进行详细的耗时分析。

如表 2-2 所示，curl 提供了详细的耗时分析选项，可以让我们更准确地掌握每一个环节的耗时、找准问题源头，从而提升网络优化的效率和质量。

:::center
表 2-2 curl 网络请求阶段分析
:::

| 请求阶段 | 释义 |
|:--|:--|
| time_namelookup | 从请求开始到域名解析完成的耗时 |
| time_connect | 从请求开始到 TCP 三次握手完成耗时 |
| time_appconnect | 从请求开始到 TLS 握手完成的耗时 |
| time_pretransfer | 从请求开始到向服务器发送第一个 GET/POST 请求开始之前的耗时 |
| time_redirect | 重定向时间，包括到内容传输前的重定向的 DNS 解析、TCP 连接、内容传输等时间 |
| time_starttransfer | 从请求开始到内容传输前的时间 |
| time_total | 从请求开始到完成的总耗时 |

对 https://www.thebyte.com.cn (一个简单的静态网页) 使用 curl 测试：

```bash
$ curl -w '\n time_namelookup=%{time_namelookup}\n time_connect=%{time_connect}\n time_appconnect=%{time_appconnect}\n time_redirect=%{time_redirect}\n time_pretransfer=%{time_pretransfer}\n time_starttransfer=%{time_starttransfer}\n time_total=%{time_total}\n' -o /dev/null -s 'https://www.thebyte.com.cn/'
// 输出的结果
time_namelookup=0.025021
time_connect=0.033326
time_appconnect=0.071539
time_redirect=0.000000
time_pretransfer=0.071622
time_starttransfer=0.088528
time_total=0.088744
```

根据测试结果，可以计算出一些需要关注的性能指标，譬如域名解析请求耗时、TCP 建立耗时、TTFB[^3]等，表 2-3 为计算方式及说明。

:::center
表 2-3 网络请求耗时计算
:::
| 耗时 | 说明 |
|:--|:--|
| 域名解析耗时 = time_namelookup | 域名 NS 及本地 LocalDNS 解析耗时 |
| TCP 握手耗时 = time_connect - time_namelookup | 建立 TCP 连接时间 |
| SSL 耗时 = time_appconnect - time_connect | TLS 握手以及加解密处理 |
| 服务器处理请求耗时 = time_starttransfer - time_pretransfer | 服务器响应第一个字节到全部传输完成耗时 |
| TTFB  = time_starttransfer - time_appconnect | 服务器从接收请求到开始到收到第一个字节的耗时 |
| 总耗时 = time_total ||


根据对 https://www.thebyte.com.cn 测试的结果显示域名解析时间大约占据了总时间的 28%，TCP 连接大约占据了总时间的 9%，而 SSL 层耗时则占据了总时间的近 50%。

由此可见，如果想要降低 HTTPS 接口延迟，那么优化域名解析环节和 SSL 这两个阶段将会带来显著的性能收益。

[^1]: 参见 https://blog.cloudflare.com/a-question-of-timing/
[^2]: RTT（Round-Trip Time）是网络请求从起点到目的地然后再回到起点所花费的时长。
[^3]: TTFB（Time To First Byte，首字节时间）用户客户端从所请求服务器接收首个字节数据所需的时间，是衡量服务质量的重要指标。

