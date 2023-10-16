# 2.2 HTTPS 请求阶段分析

着手优化之前，我们得先看看一个 HTTPS 请求有哪些环节以及了解耗时如何计算。

## 2.2.1 请求阶段分析

一个完整、无任何缓存、未复用连接的 HTTPS 请求需要经过以下几个阶段：DNS 域名解析、TCP 握手、SSL 握手、服务器处理、内容传输。

<div  align="center">
	<img src="../assets/http-process.png" width = "500"  align=center />
	<p>图2-2 HTTPS（使用 TLS1.2 协议）请求阶段分析</p>
</div>

如图 2-2 所示，一个 HTTPS 请求共需要 5 个 RTT = 1 RTT（域名解析） + 1 RTT（TCP 握手）+ 2 RTT（SSL 握手）+ 1 RTT（HTTP 内容请求传输）。

举个例子，说明接口延迟的计算和影响：假设北京到美国洛杉矶的 RTT 延迟为 190 毫秒，我们从北京访问美国洛杉矶的一个 HTTP 服务，整个交互过程时延计算是`5*190+后端业务延时`。其中，"5"代表的是 HTTPS 请求的 5 个环节，每个环节都需要一个 RTT 的时间。因为网络延迟始终会受到物理环境的制约，无论使用什么技术、如何优化，950ms 的指标将会很难突破，所以我们的优化策略也是以减少请求环节、链路优化、降低 SSL 计算量为主。

## 2.2.2 请求阶段耗时分析

HTTPS 请求的各个阶段可以使用 curl 命令进行详细的耗时分析[^1]。如表 2-2 所示， curl 提供了详细的耗时分析选项，这样我们就可以更准确地掌握每一个环节的消耗时间，进一步提升网络优化的效率和精度。


表 2-2 curl 网络请求阶段分析
| 请求阶段 | 释义 |
|:--|:--|
| time_namelookup | 从请求开始到域名解析完成的耗时 |
| time_connect | 从请求开始到 TCP 三次握手完成耗时 |
| time_appconnect | 从请求开始到 TLS 握手完成的耗时 |
| time_pretransfer | 从请求开始到向服务器发送第一个 GET/POST 请求开始之前的耗时 |
| time_redirect | 重定向时间，包括到内容传输前的重定向的 DNS 解析、TCP 连接、内容传输等时间 |
| time_starttransfer | 从请求开始到内容传输前的时间 |
| time_total | 从请求开始到完成的总耗时 |

对一个接口使用 curl 测试：

```plain
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

业务常关注的性能指标有：域名解析请求耗时、TCP 建立耗时、TTFB（Time To First Byte，首字节时间）等，表 2-3 为计算方式及说明。

表 2-3 网络请求耗时计算

| 耗时 | 说明 |
|:--|:--|
| 域名解析耗时 = time_namelookup | 域名 NS 及本地 LocalDNS 解析耗时 |
| TCP 握手耗时 = time_connect - time_namelookup | 建立 TCP 连接时间 |
| SSL 耗时 = time_appconnect - time_connect | TLS 握手以及加解密处理 |
| 服务器处理请求耗时 = time_starttransfer - time_pretransfer | 服务器响应第一个字节到全部传输完成耗时 |
| TTFB  = time_starttransfer - time_appconnect | 服务器从接收请求到开始到收到第一个字节的耗时 |
| 总耗时 = time_total ||


`https://www.thebyte.com.cn`测试的结果显示域名解析时间大约占据了总时间的 28%，TCP 连接大约占据了总时间的 9%，而 SSL 层耗时则占据了总时间的近 50%。
由此可见，如果我们想要降低 HTTPS 接口延迟，那么优化域名解析环节和 SSL 这两个阶段将会为我们带来显著的性能提升。

优化工作的第一步，我们先开始处理域名解析环节。

[^1]: curl 操作参见 https://catonmat.net/cookbooks/curl

