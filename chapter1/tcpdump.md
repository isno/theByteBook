# tcpdump与wireshark

tcpdump 也是最常用的一个网络分析工具。它基于libpcap利用内核中的 AF_PACKET 套接字，抓取网络接口中传输的网络包；并提供了强大的过滤规则，帮我们从大量的网络包中，挑出最想关注的信息。而wireshark是桌面版的抓包分析工具，tcpdump 虽然功能强大，但输出确不直观，我们可以在linux中先通过tcpdump 抓包，并保存至.pcap格式文件中，再将文件拷贝至本地，通过wireshark打开文件进行包的过滤和分析。

tcpdump 和 wireshark结合使用，基本可以排查出绝大部分的网络问题了。

### tcpdump使用

```
tcpdump [选项] [过滤表达式]
```

来看一下常用的几个选项

|选项|示例|说明|
|:---|:---|:---|
|-i| tcpdump -i eth0 | 指定网络接口，默认0 (eth0), any表示所有的网络接口 |
|-nn| tcpdump -nn | 不解析ip地址和端口的名称|
|-c| tcmpdump -c5| 限制要抓取的网络包个数|
|-A| tcpdump -A| 以ASCII 显示网络包内容，不指定只显示头部信息|
|-w| tcpdump -w test.pcap| 保存到文件，结合wireshark 使用|
|-e| tcpdump -e| 输出链路层的头部信息|

根据 IP 地址反查域名、根据端口号反查协议名称，是很多网络工具默认的行为，而这往往会导致性能工具的工作缓慢。所以网络性能工具都会提供一个选项（比如 -n 或者 -nn），来禁止名称解析。

### tcpdump过滤

|表达式|示例|说明|
|:---|:---|:---|
|host, src host, dst host| tcpdump -nn host 110.100.32.2 | 主机过滤|
|net, src net, dst net| tcpdump -nn net 192.168.1.3| 网络过滤|
|port, portrange, src port, dst port| tcpdump -nn dst port 80| 端口过滤|
|ip, ip6, arp, tcp, udp, icmp| tcpdump -nn tcp| 协议过滤|
|and, or, not | tcpdump -nn tcp and udp| 逻辑表达式|
|tcp[tcpflags]| tcpdump -nn "tcp[tcpflags] & tcp-syn!=0"| TCP包过滤| 

tcpdump 的输出格式

```
// 时间戳 协议 源地址.源端口 > 目的地址.目的端口 网络包详细信息

14:21:02.364734 IP 172.19.211.112.8080 > 223.167.220.93.60256: Flags [S.], seq 3782037896, ack 220353195, win 28960, options [mss 1460,sackOK,TS val 1839251154 ecr 439909343,nop,wscale 7], length 0
```

网络包的详细信息取决于协议，不同协议展示的格式也不同。更详细的使用方法，还需要查询 tcpdump 的 man 手册（执行 man tcpdump 也可以得到）。

tcpdump 虽然功能强大，可是输出格式却并不直观。特别当系统中网络包数比较多（比如 PPS 超过几千）的时候，想从 tcpdump 抓取的网络包中分析问题非常困难。
这时候我们可以在linux中先通过tcpdump 抓包，并保存至.pcap格式文件中，再将文件拷贝至Mac本地，通过wireshark打开文件进行包的过滤和分析。

```
tcpdump -nn tcp port 80 -w test.pcap
```

在wireshark的菜单栏中，点击 Statistics -> Flow Graph，然后，在弹出的界面中的 Flow type 选择 TCP Flows，可以更清晰的看到，整个过程中 TCP 流的执行过程。

<div  align="center">
	<p>图: TCP Flows</p>
	<img src="/assets/chapter1/tcp-flow.png" width = "650"  align=center />
</div>