# 3.1 HTTPS 请求阶段分析

:::tip <i></i>
小张是一名后端工程师，他报告了一个光速般的30ms的后端接口延迟。领导一看，感觉像看到了闪电，指示立马给小张加薪升职。接着轮到前端小王，它的接口延迟指标是 3000ms。简直比走路还慢！这个季度小王绩效是B减。
:::

小王是不是很冤？我们得先看看 HTTP(S) 请求的各个阶段。

<div  align="center">
	<img src="../content/assets/http-process.png" width = "500"  align=center />
	<p>图 3-1 HTTPS（TLS1.2）请求阶段</p>
</div>

一个完整 HTTPS 请求流程包括：

1. DNS 域名解析
2. TCP 握手
3. SSL 握手
4. 服务器处理
5. 内容传输阶段



## 3.1.1 耗时分析

如果想对 HTTP 性能监控或者在命令行下分析，可以通过 curl 工具来统计各阶段耗时情况。curl 命令支持的阶段耗时归纳总结如表 3-1 所示。
<div  align="center">
	<p>表 3-1 curl 支持的耗时统计</p>
</div>

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

通过分析上述的执行结果，我们可以看到有几个关键的时间消耗环节，其中DNS解析约占总时间的28%，TCP连接约占9%，而SSL握手则占到了约50%。从这些指标中，我们可以清晰地看出，如果我们想要优化网络性能，那么在DNS解析、TCP连接和SSL握手这三个阶段的优化将会带来显著的性能提升。

