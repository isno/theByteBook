#网络性能观测工具

针对Linux网络性能指标，可以利用一些网络中流行的工具，我将这些工具、软件汇成以下表格，以供读者参考。在本章节也将拾取部分工具进行讲解

|性能指标|工具|说明
|:---|:----|:---
|吞吐量| sar<br/> nethogs<br/> iftop |分别可以查看网络接口、进程以及IP地址的网络吞吐量
|PPS| sar<br/> proc/net/dev |查看网络接口的PPS
|连接数|netstat <br/> ss| 查看网络连接数 
|延迟|ping<br/>hiping3|通过ICMP、TCP测试两个节点之间的延时
|连接跟踪数|conntrack|查看和管理连接跟踪状况
|路由|mtr <br/> traceroute| 查看路由并测试链路状况
|dns| dig <br/> nslookup| 查看排查DNS解析问题
|防火墙和NAT| iptables | 配置、管理防火墙规则以及NAT转发
|网卡功能| ethtool | 查看配置网络接口的功能
|抓包|tcpdump <br/> Wireshark | 抓包分析网络流量 
|内核协议栈跟踪 | bbc <br/> systemtap | 动态跟踪内核协议栈行为 

