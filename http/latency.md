# 2.2 HTTPS 请求阶段分析

在优化网络之前，我们得先看看一个HTTPS请求有哪些环节以及了解耗时如何计算。

## 2.2.1 请求阶段分析

一个完整、无任何缓存、未复用连接的HTTPS请求需要经过以下几个阶段，DNS域名解析、TCP 握手、SSL 握手、服务器处理、内容传输。如图2-1示例。

<div  align="center">
	<img src="../content/assets/http-process.png" width = "500"  align=center />
	<p>图 2-1 HTTPS（使用TLS1.2协议）请求阶段</p>
</div>

当我们评估网络时延时，常常使用RTT（Round-Trip Time，往返时延）作为评判指标。如图2-1示例，HTTPS共需要5个RTT = 1RTT(DNS) + 1RTT（TCP 握手）+ 2RTT（SSL握手，使用TLS1.2协议）+ 1RTT（HTTP 内容请求传输）。

用一个例子来说明接口延迟的计算和影响。假设北京到美国洛杉矶的RTT时延为190毫秒，我们从北京访问美国洛杉矶的一个HTTP服务，整个交互过程时延计算是`5*190+后端业务延时`。其中，"5"代表的是HTTPS请求的五个环节，每个环节都需要一个RTT的时间。

网络时延始终会受到物理距离的制约，在这个情况下，无论使用什么技术、如何优化，950ms的指标将会很难突破。所以后续的优化思路也是减少请求环节、链路优化、降低SSL计算量为主。

## 2.2.2 请求阶段耗时分析

我们可以利用一些工具，比如curl命令，来对一个请求的各个阶段进行详细的耗时分析。curl提供了详细的耗时分析选项，如表2-1所示。这样一来，我们就可以更准确地掌握每一个环节的消耗时间，进一步提升网络优化的效率和精度。

表2-1，网络请求阶段分析。
| 请求阶段 | 释义 |
|:--|:--|
| time_namelookup | 从请求开始到 DNS 解析完成的耗时 |
| time_connect | 从请求开始到 TCP 三次握手完成耗时 |
| time_appconnect | 从请求开始到 TLS 握手完成的耗时 |
| time_pretransfer | 从请求开始到向服务器发送第一个 GET/POST 请求开始之前的耗时 |
| time_redirect | 重定向时间，包括到内容传输前的重定向的 DNS 解析、TCP 连接、内容传输等时间 |
| time_starttransfer | 从请求开始到内容传输前的时间 |
| time_total | 从请求开始到完成的总耗时 |

我们对一个接口使用curl测试。

```
$ curl -w '\n time_namelookup=%{time_namelookup}\n time_connect=%{time_connect}\n time_appconnect=%{time_appconnect}\n time_redirect=%{time_redirect}\n time_pretransfer=%{time_pretransfer}\n time_starttransfer=%{time_starttransfer}\n time_total=%{time_total}\n' -o /dev/null -s -L 'https://www.thebyte.com.cn/'

time_namelookup=0.025021
time_connect=0.033326
time_appconnect=0.071539
time_redirect=0.000000
time_pretransfer=0.071622
time_starttransfer=0.088528
time_total=0.088744
```

业务常关注的性能指标有 DNS 请求耗时、TCP 建立耗时、TTFB （Time To First Byte）等，表2-2为计算方式及说明。

表2-2，网络请求耗时计算。

| 耗时 | 说明 |
|:--|:--|
| DNS 请求耗时 = time_namelookup | 域名 NS 及本地 LocalDNS 解析耗时 |
| TCP 握手耗时 = time_connect - time_namelookup | 用户端到服务端的网络耗时 |
| SSL握手耗时 = time_appconnect - time_connect | SSL 层处理耗时 |
| 服务器处理请求耗时 = time_starttransfer - time_pretransfer | 服务器响应第一个字节到全部传输完成耗时 |
| TTFB  = time_starttransfer - time_appconnect | 服务器从接收请求到开始到收到第一个字节的耗时 |
| 总耗时 = time_total ||


对`https://www.thebyte.com.cn`测试的结果中，我们发现DNS解析大约占据了总时间的28%，TCP连接大约占据了总时间的9%，而SSL握手则占据了总时间的近50%。
由此可见，如果我们想要提升网络性能，DNS解析和SSL握手这两个关键阶段的优化将会为我们带来显著的性能提升。

优化工作的第一步，我们先开始处理DNS。

