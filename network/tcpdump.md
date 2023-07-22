# 2.5.2 使用 tcpdump 排查网络问题 

tcpdump 是一款强大的网络分析工具，它可以抓取网络接口中传输的网络包，并提供了强大的过滤规则，帮我们从大量的网络包中，挑出最想关注的信息。


> 有一个小问题，iptables规则会影响tcpdump抓包吗？
> 答案是不会，tcpdump抓包是libpcap实现的，libpcap是用bpf（Berkeley Packet Filter）实现的，bpf位于netfilter前，所以不会影响抓包。


tcpdump虽然功能强大，但输出确不直观，我们可以通过 tcpdump和wireshark组合的方式来排查问题。我们可以在linux中先通过tcpdump 抓包，并保存至.pcap格式文件中，再将文件拷贝至本地，通过wireshark打开文件进行可视化地包的过滤和分析。

tcpdump 和 wireshark结合使用，基本可以排查出绝大部分的网络问题了。

## HTTP/TCP 抓包实践

如下命令可以下载一个 example.com 网站的首页文件 index.html

```
# wget http://example.com
Connecting to example.com (93.184.216.34:80)
index.html           100% |*****************************|  1270   0:00:00 ETA
```

虽然这看起来极其简单，但背后却涵盖了很多复杂的过程，例如：

1. 域名查找：通过访问 DNS 服务查找 example.com 服务器对应的 IP 地址
2. TCP 连接参数初始化：临时端口、初始序列号的选择等等
3. 客户端（容器）通过 TCP 三次握手协议和服务器 IP 建立 TCP 连接
4. 客户端发起 HTTP GET 请求
5. 服务器返回 HTTP 响应，包含页面数据传输
6. 如果页面超过一个 MTU，会分为多个 packet 进行传输
7. TCP 断开连接的四次挥手

### 抓包：打到标准输出

用下面的 tcpdump 命令抓包，另一窗口执行 wget https://www.thebyte.com.cn，能看到如下类 似的输出

```
$ tcpdump -n -S -i en0 host thebyte.com.cn
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on en0, link-type EN10MB (Ethernet), snapshot length 524288 bytes
13:48:57.613267 IP 10.4.152.224.61494 > 110.40.229.45.443: Flags [S], seq 1508194194
...
```
参数说明：

- -n：打印 IP 而不是 hostname，打印端口号而不是协议（例如打印 80 而不是 http）
- -S：打印绝对时间戳
- -i en0 en0 网卡抓包
- host thebyte.com.cn：抓和 thebyte.com.cn 通信的包

### 抓包：存文件

由于标准化的输出内容较多，很难就行梳理分析，我们可以把输出保存成文件，然后用 wireshark 进行分析。
使用 -w 命令可以将抓到的包写到文件。

```
$ tcpdump -i en0 host thebyte.com.cn -w thebyte.com.cn.pcap

tcpdump: listening on en0, link-type EN10MB (Ethernet), snapshot length 524288 bytes
^C42 packets captured
135 packets received by filter
0 packets dropped by kernel

```