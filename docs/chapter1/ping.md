#Ping

Ping命令虽然简单，但作用性很大，除了用来判断主机的可达性外，很多分布式服务就近节点选择也是基于Ping的延迟计算。

Ping的工作流程是构造一个Echo Request的查询报文，并将本地时间戳写入其中，待目标主机收到此ICMP报文后，回复ICMP Echo Reply Message报文。
本地主机收到后，再根据本地时间戳计算两个节点之间的延迟。

Ping时常见的ICMP错误主要有下面几种：

错误|原因
:---|:--
目的主机不可达destnation host  unreachable	|目的网络中找不到目的主机
目的网络不可达 destnation network  unreachable|经过节点没有路由可达，或者经过节点设备存在acl拦截
传输失败，一般错误  transmit failed. General failure	|源设备中没有默认路由
 ttl传输中过期    ttl exceeded	|目标ip网段在环境中存在路由环路
路由重定向   icmp redirect	|路由错误，比如目的ip应该走直连路由却送到网关上去了



另外如果一个节点Ping timeout不通，也不一定就说明节点网络存在问题，有可能是主机设置了icmp_echo_ignore_all，该设置一般是为了避免ICMP攻击，但不建议禁用，如果为了避免ICMP攻击，可以尝试采用COPP (Control Plane Policy) 限速机制来限制ICMP发送频率，比如限速 ICMP Rate为1秒一个，这样既可以便于排错又能避免ICMP攻击。