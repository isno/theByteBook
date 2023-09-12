# 3.1 HTTPS 请求阶段分析

在优化网络之前，我们得先看看一个HTTPS网络接口请求有哪些环节。

## 3.1.1 请求阶段分析

一个完整的、无任何缓存、未复用连接的HTTPS请求，需要经过DNS域名解析、TCP 握手、SSL 握手、服务器处理、内容传输阶段。如图2-1示例示例。

<div  align="center">
	<img src="../content/assets/http-process.png" width = "500"  align=center />
	<p>图 2-1 HTTPS（TLS1.2）请求阶段</p>
</div>

判断网络时延，我们通常使用RTT（Round-Trip Time，往返时延）的用时衡量。如图2-1示例，一个HTTPS共需要5个RTT = 1RTT(DNS) + 1RTT（TCP 握手）+ 2RTT（SSL握手，使用TLS1.2协议）+ 1RTT（HTTP 内容请求传输）。

北京到美国洛杉矶的网络时延约在190毫秒。如果我们从北京访问美国的一个接口服务（`5*190+后端业务延时`），大概需要1s的时间。

## 3.1.2 请求阶段耗时分析

我们可以使用一些工具，对一个请求的各个阶段进行更详细的耗时分析，例如使用curl命令，curl支持非常详细的耗时分析，如表3-1所示。

| 请求阶段 | 释义 |
|:--|:--|
| time_namelookup | 从请求开始到 DNS 解析完成的耗时 |
| time_connect | 从请求开始到 TCP 三次握手完成耗时 |
| time_appconnect | 从请求开始到 TL S握手完成的耗时 |
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
表 3-2为以上的输出结果说明。

业务常关注的性能指标有 DNS 请求耗时、TCP 建立耗时、TTFB （Time To First Byte）等，以下表格为计算方式及说明。

| 耗时 | 说明 |
|:--|:--|
| DNS 请求耗时 = time_namelookup | 域名 NS 及本地 LocalDNS 解析耗时 |
| TCP 握手耗时 = time_connect - time_namelookup | 用户端到服务端的网络耗时 |
| SSL握手耗时 = time_appconnect - time_connect | SSL 层处理耗时 |
| 服务器处理请求耗时 = time_starttransfer - time_pretransfer | 服务器响应第一个字节到全部传输完成耗时 |
| TTFB  = time_starttransfer - time_appconnect | 服务器从接收请求到开始到收到第一个字节的耗时 |
| 总耗时 = time_total ||


通过分析上述的执行结果，我们可以看到有几个关键的时间消耗环节，其中DNS解析约占总时间的28%，TCP连接约占9%，而SSL握手则占到了约50%。
根据这些指标结果的判断，如果我们想要优化网络性能，那么在DNS解析、TCP连接和SSL握手这三个阶段的优化将会带来显著的性能提升。

