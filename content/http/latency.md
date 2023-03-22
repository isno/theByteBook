# HTTPS性能分析

应用层面最重要的网络协议是HTTP，搞明白HTTP的流程以及延迟过程也基本掌握了应用层的网络优化方法。

通常HTTP的性能分析是通过浏览器的开发者工具进行查看，但这种方式只能通过图形页面进行查看，如果想做性能监控或者在命令行下分析，可以通过curl命令来统计各阶段的耗时。

```
curl 是一种命令行工具，作用是发出网络请求。像爱奇艺的核心网络库QTP，也是基于curl进行开发。
```

## 请求流程分析

一个完整的HTTPS请求流程涵盖：DNS、TCP、SSL握手、服务器处理、内容传输等流程，我们用流程图看一下HTTP请求的完整过程：

<div  align="center">
	<p>图：HTTP请求流程</p>
	<img src="../assets/http-process.png" width = "500"  align=center />
</div>

## 各阶段耗时统计

对于上面的流程延迟我们可以用curl命令分析，curl命令支持以下阶段的时间统计：

- time_namelookup : 从请求开始到DNS解析完成的耗时
- time_connect : 从请求开始到TCP三次握手完成耗时
- time_appconnect : 从请求开始到TLS握手完成的耗时
- time_pretransfer : 从请求开始到向服务器发送第一个GET请求开始之前的耗时
- time_redirect : 重定向时间，包括到内容传输前的重定向的DNS解析、TCP连接、内容传输等时间
- time_starttransfer : 从请求开始到内容传输前的时间
- time_total : 从请求开始到完成的总耗时

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

