#HTTP性能分析

应用层面最重要的网络协议是HTTP，搞明白HTTP的流程以及延迟过程也基本掌握了应用层的网络优化方法。通常HTTP的性能分析是通过浏览器的开发者工具进行查看，但这种方式只能通过图形页面进行查看。

如果想做性能监控或者在命令行下分析，可以通过curl命令来统计各阶段的耗时。

```
curl 是一种命令行工具，作用是发出网络请求。像爱奇艺的核心网络库QTP，也是基于curl进行开发。
```

### HTTP请求流程

一个完整的HTTPS请求流程涵盖：DNS、TCP、SSL握手、服务器处理、内容传输等流程，我们用流程图看一下HTTP请求的完整过程：

<div  align="center">
	<p>图：HTTP请求流程</p>
	<img src="/assets/chapter2/http-process.png" width = "600"  align=center />
</div>

### HTTP流程各阶段耗时统计

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

以上内容不够直观，curl -w参数支持模板，新建一个文件timing.txt,内容如下：

```
time_namelookup=%{time_namelookup}\n
time_connect=%{time_connect}\n
time_appconnect=%{time_appconnect}\n
time_redirect=%{time_redirect}\n
time_pretransfer=%{time_pretransfer}\n
time_starttransfer=%{time_starttransfer}\n
time_total=%{time_total}\n
```
使用模版执行

```
curl -w "@timing.txt" -o /dev/null -s -L 'https://www.thebyte.com.cn/'
```


### CURL请求耗时封装

将上述功能生成脚本stat.sh

```
#!/bin/bash

Default_URL=https://www.thebyte.com.cn
URL=${1:-$Default_URL}

Result=`curl -o /dev/null -s $URL -w \
        'time_namelookup=%{time_namelookup}
time_connect=%{time_connect}
time_appconnect=%{time_appconnect}
time_redirect=%{time_redirect}
time_pretransfer=%{time_pretransfer}
time_starttransfer=%{time_starttransfer}
time_total=%{time_total}
'`

declare $Result

curl_timing(){
    printf "\e[92mcURL Timing: \e[0m\n"
    for i in $Result
    do  
            IFS='='
            printf "\e[96m%18s \e[0m: %10s \n" $i
    done
}
stat_timing(){

    Result_TCP=`printf "%.6f" $(echo $time_connect - $time_namelookup |bc -l)`
    Result_TLS=`printf "%.6f" $(echo $time_appconnect - $time_connect |bc -l)`
    Result_Server=`printf "%.6f" $(echo $time_starttransfer - $time_pretransfer |bc -l)`
    Result_TTFB=`printf "%.6f" $(echo $time_starttransfer - $time_appconnect |bc -l)`
    Result_Transfer=`printf "%.6f" $(echo $time_total - $time_starttransfer |bc -l)`

    printf "\n\e[92mResource Timing: \e[0m\n"
    printf "\e[96m%18s \e[0m: %.6f \n" "DNS Lookup" $time_namelookup
    printf "\e[96m%18s \e[0m: %.6f \n" "TCP Connection" $Result_TCP
    
    if  [ `echo "$time_appconnect == 0"|bc` -eq 0 ]
    then
        printf "\e[96m%18s \e[0m: %.6f \n" "TLS Handshake" $Result_TLS
    fi

    printf "\e[96m%18s \e[0m: %.6f \n" "Server Processing" $Result_Server
    printf "\e[96m%18s \e[0m: %.6f \n" "TTFB" $Result_TTFB
    printf "\e[96m%18s \e[0m: %.6f \n" "Content Transfer" $Result_Transfer
    printf "\e[96m%18s \e[0m: %.6f \n" "Finish" $time_total
}

curl_timing
stat_timing 
```

执行一下：非常清楚的看到HTTP请求各个阶段的延迟了

```
# ./stat.sh https://www.thebyte.com.cn

cURL Timing: 
   time_namelookup :   0.004087 
      time_connect :   0.006480 
   time_appconnect :   0.022001 
     time_redirect :   0.000000 
  time_pretransfer :   0.022026 
time_starttransfer :   0.025635 
        time_total :   0.025658 

Resource Timing: 
        DNS Lookup : 0.004087 
    TCP Connection : 0.002393 
     TLS Handshake : 0.015521 
 Server Processing : 0.003609 
              TTFB : 0.003634 
  Content Transfer : 0.000023 
            Finish : 0.025658 
```

