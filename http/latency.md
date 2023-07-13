# 3.2 HTTPS请求阶段分析

HTTP 协议是程序员最常打交道的协议之一，一个完整 HTTPS 请求流程涵盖：DNS 域名解析、TCP握手、SSL 握手、服务器处理、内容传输等流程。搞明白了这个流程，面对网络优化或者网络问题排障等也就得心应手。下面的流程图展示了 HTTPS 请求的各个阶段过程：

<div  align="center">
	<p>图：HTTPS 请求流程</p>
	<img src="../content/assets/http-process.png" width = "500"  align=center />
</div>

## 3.2.1 耗时分析

如果想对 HTTP 性能监控或者在命令行下分析，可以通过 curl 工具来统计各阶段耗时情况。curl 命令支持以下阶段的耗时统计：

| 请求阶段 | 释义 |
|:--|:--|
| time_namelookup | 从请求开始到 DNS 解析完成的耗时 |
| time_connect | 从请求开始到 TCP 三次握手完成耗时 |
| time_appconnect | 从请求开始到 TL S握手完成的耗时 |
| time_pretransfer | 从请求开始到向服务器发送第一个 GET/POST 请求开始之前的耗时 |
| time_redirect | 重定向时间，包括到内容传输前的重定向的 DNS 解析、TCP 连接、内容传输等时间 |
| time_starttransfer | 从请求开始到内容传输前的时间 |
| time_total | 从请求开始到完成的总耗时 |


我们常关注的HTTP性能指标有：

- DNS请求耗时 ： 域名的NS及本地使用DNS的解析速度
- TCP建立耗时 ： 服务器网络层面的速度
- SSL握手耗时 ： 服务器处理HTTPS等协议的速度
- 服务器处理请求时间 ： 服务器处理HTTP请求的速度
- TTFB ： 服务器从接收请求到开始到收到第一个字节的耗时
- 服务器响应耗时 ：服务器响应第一个字节到全部传输完成耗时
- 请求完成总耗时

其中的运算关系：

- DNS请求耗时 = time_namelookup
- TCP三次握手耗时 = time_connect - time_namelookup
- SSL握手耗时 = time_appconnect - time_connect
- 服务器处理请求耗时 = time_starttransfer - time_pretransfer
- TTFB耗时 = time_starttransfer - time_appconnect
- 服务器传输耗时 = time_total - time_starttransfer
- 总耗时 = time_total

用curl命令统计以上时间：

```
curl -w '\ntime_namelookup=%{time_namelookup}\ntime_connect=%{time_connect}\ntime_appconnect=%{time_appconnect}\ntime_redirect=%{time_redirect}\ntime_pretransfer=%{time_pretransfer}\ntime_starttransfer=%{time_starttransfer}\ntime_total=%{time_total}\n\n' -o /dev/null -s -L 'https://www.thebyte.com.cn/'
```

分析以下的执行结果，有几个关键的耗时阶段：

- DNS 耗时约占 28%
- TCP 连接 9% 
- SSL 约占 50% 

从这几个指标也可以看出，我们着手优化的手段就在 DNS、HTTP和 SSL层优化处理。

```
time_namelookup=0.025021
time_connect=0.033326
time_appconnect=0.071539
time_redirect=0.000000
time_pretransfer=0.071622
time_starttransfer=0.088528
time_total=0.088744
```

