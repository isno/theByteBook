# LVS 理解

LVS是Linux Virtual Server的简写，意即Linux虚拟服务器，是一个虚拟的服务器集群系统 。

主要是基于Netfilter实现的四层负载均衡集群系统，可在传输层将一组服务器构成一个实现可伸缩、高可用网络服务的虚拟服务群集。

LVS由两部分组成：ipvs和ipvsadm

- ipvs(ip virtual server)是Linux内核的一部分，实现传输层调度、转发等负载均衡的核心功能
- ipvsadm 是 ipvs 在应用层的命令接口，负责为ipvs定义规则、集群服务等

## SLB服务术语

LVS中有一些概念术语，如果没有释义，初看还有点迷糊。这些术语分为两个部分：Server相关和IP相关。

|缩写|全称|释义|
|:---|:---|:--|
|DS|Director Server |指的是前端负载均衡器节点，又称 Dispatcher、Balancer，主要接收用户请求|
|RS| Real Server |后端真实的工作服务器|

对Server的不同，角色的IP也有不同的术语

|缩写|全称|释义|
|:---|:---|:--|
|CIP|Client IP|用户客户端的IP|
|VIP|Virtual IP |LVS实例IP，一般是暴露在公网中的地址；向外部直接面向用户请求，作为用户请求的目标的IP地址|
|DIP| Director IP|主要用于和内部主机通讯的IP地址|
|RIP|Real IP |后端服务器的真实IP|

## LVS的工作原理

笔者在第一章讲解过 Netfilter，也不难猜测出：LVS 主要通过向 Netfilter 的3个阶段注册钩子函数来对数据包进行处理，如下图

<div  align="center">
	<img src="../assets/lvs-netfilter.png" width = "580"  align=center />
</div>


- 在 LOCAL_IN 阶段注册了 ip_vs_in() 钩子函数: 在路由判决之后，如果发现数据包是发送给本机的，那么就调用 ip_vs_in() 函数对数据包进行处理。
- 在 FORWARD 阶段注册了 ip_vs_out() 钩子函数: 在路由判决之后，如果发现数据包不是发送给本机的，调用 ip_vs_out() 函数对数据包进行处理。
- 在 POST_ROUTING 阶段注册了 ip_vs_post_routing() 钩子函数: 在发送数据前，需要调用 ip_vs_post_routing() 函数对数据包进行处理

如数据转发的流程的实现：

当数据包进入到 Director服务器后，会被 LOCAL_IN阶段的 ip_vs_in() 钩子函数进行处理。

ip_vs_in() 函数首先查找客户端与真实服务器的连接是否存在，如果存在就使用这个真实服务器。否则通过调度算法对象选择一台最合适的真实服务器，然后建立客户端与真实服务器的连接关系。

根据运行模式来选择发送数据的接口（如 NAT模式 对应的是 ip_vs_nat_xmit() 函数），再把数据转发出去。

转发数据时，首先会根据真实服务器的IP地址更新数据包的路由信息，然后再更新各个协议头部的信息（如IP地址、端口和校验和等），然后把数据发送出去。