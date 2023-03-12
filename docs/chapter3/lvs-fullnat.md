#LVS FULLNAT


LVS 当前应用主要采用 DR 和 NAT 模式，但这 2 种模式要求 RealServer 和 LVS
在同一个 vlan中，导致部署成本过高；TUNNEL 模式虽然可以跨 vlan，但 RealServer
上需要部署 ipip 模块等，网络拓扑上需要连通外网，较复杂，不易运维。
为了解决上述问题，我们在 LVS 上添加了一种新的转发模式：FULLNAT，该
模式和 NAT 模式的区别是：Packet IN 时，除了做 DNAT，还做 SNAT（用户 ip->内
网 ip），从而实现 LVS-RealServer 间可以跨 vlan 通讯，RealServer 只需要连接到内
网；



1、client主机（cip）将请求发往前端的负载均衡器（vip），请求报文源地址是CIP，目标地址为VIP。负载均衡器收到报文后，发现请求的是在规则里面存在的地址，那么它将客户端请求报文的源MAC地址改为自己DIP的MAC地址，目标MAC改为了RIP的MAC地址，并将此包发送给RS。
2、RS发现请求报文中的目的MAC是自己，就会将次报文接收下来，处理完请求报文后，将响应报文通过lo接口送给eth0网卡直接发送给client主机（cip）。

fullnat模式优缺点：

FULLNAT一个最大的问题是：RealServer无法获得用户IP；为了解决这个问题我们提出了TOA的概念，主要原理是：将clientaddress放到了TCP Option里面带给后端RealServer，RealServer上通过toa内核模块hack了getname函数，给用户态返回TCP Option中的client ip。
