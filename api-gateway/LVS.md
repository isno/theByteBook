# LVS 理解

LVS是Linux Virtual Server的简写，意即Linux虚拟服务器，是一个虚拟的服务器集群系统 。

主要是基于Netfilter实现的四层负载均衡集群系统，可在传输层将一组服务器构成一个实现可伸缩、高可用网络服务的虚拟服务群集。

LVS由两部分组成：ipvs和ipvsadm

- ipvs(ip virtual server)是Linux内核的一部分，实现传输层调度、转发等负载均衡的核心功能
- ipvsadm 是 ipvs 在应用层的命令接口，负责为ipvs定义规则、集群服务等

## LVS中的术语

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