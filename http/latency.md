# 3.1 HTTPS 请求阶段分析

HTTP(S) 协议是绝对是互联网程序员最常打交道的协议，绝大部分的互联网流量都是由 HTTP(S) 进行传输。只有搞明白 HTTP(S)请求流程在面对网络优化或者网络问题排障等问题场景时候，才能得心应手。

一个完整 HTTP(S)请求流程包括：DNS 域名解析、TCP握手、SSL 握手、服务器处理、内容传输等流程。下面的流程图展示了 HTTP(S) 请求的各个阶段：

<div  align="center">
	<img src="../content/assets/http-process.png" width = "500"  align=center />
	<p>图：HTTP(S) 请求阶段</p>
</div>

## 3.1.1 耗时分析

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


业务常关注的性能指标有 DNS 请求耗时、TCP 建立耗时、TTFB （Time To First Byte）等，以下表格为计算方式及说明。

| 耗时 | 说明 |
|:--|:--|
| DNS 请求耗时 = time_namelookup | 域名 NS 及本地 LocalDNS 解析耗时 |
| TCP 握手耗时 = time_connect - time_namelookup | 用户端到服务端的网络耗时 |
| SSL握手耗时 = time_appconnect - time_connect | SSL 层处理耗时 |
| 服务器处理请求耗时 = time_starttransfer - time_pretransfer | 服务器响应第一个字节到全部传输完成耗时 |
| TTFB  = time_starttransfer - time_appconnect | 服务器从接收请求到开始到收到第一个字节的耗时 |
| 总耗时 = time_total ||


用 curl 命令 请求 https://www.thebyte.com.cn 进行示例分析 

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

分析上面的执行结果，有几个关键耗时阶段，其中 DNS 耗时约占 28%、TCP 连接 9% 、SSL 约占 50% 。从这几个指标也可以看出，如果要进行网络性能优化，DNS、TCP 和 SSL 层优化处理会有较大提升。

