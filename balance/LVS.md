# LVS 理解

LVS 是 Linux Virtual Server 的简写，意即 Linux 虚拟服务器。之所以是虚拟服务器，是因为 LVS 自身是个负载均衡器(Director Server)，不直接处理请求，而是将请求转发至位于它后端真正的服务器 Real Server 上

负载均衡(LB) 集群的架构和原理很简单，就是当用户的请求过来时，会直接分发到 Director Server 上，然后它把用户的请求根据设置好的调度算法，智能均衡地分发到后端真正服务器 (real server) 上。为了避免不同机器上用户请求得到的数据不一样，需要用到共享存储，这样保证所有用户请求的数据是一样的。


LVS 由两部分组成：ipvs 和 ipvsadm

- ipvs(ip virtual server)是 Linux 内核的一部分，实现传输层调度、转发等负载均衡的核心功能。
- ipvsadm 是 ipvs 在应用层的命令接口，负责为 ipvs 定义规则、集群服务等

## SLB 服务术语

首先要解释的是 LVS 相关的几种 IP

- VIP：virtual IP，LVS 服务器上接收外网数据包的网卡 IP 地址，是用于接收用户请求的 IP。
- DIP：director IP，LVS 服务器上转发数据包到 realserver 的网卡 IP 地址，是用于连接内网的 IP。
- RIP：realserver(常简称为 RS)上接收 Director 转发数据包的 IP，即提供服务的服务器 IP。
- CIP：客户端的 IP


Server 相关

- DS：Director Server 指的是前端负载均衡器节点，又称 Dispatcher、Balancer，主要接收用户请求
- RS：Real Server 后端真实的工作服务器

工作流程：CIP---->(DS)VIP---->(DS)DIP----->(RS)RIP

## LVS 的工作原理

LVS 主要是基于 Netfilter 实现的四层负载均衡集群系统，可在传输层将一组服务器构成一个实现可伸缩、高可用网络服务的虚拟服务群集。


LVS 的 IP 负载均衡技术是通过 IPVS 模块来实现的，IPVS 是 LVS 集群系统的核心软件，它的主要作用是：安装在 Director Server 上，同时在 Director Server 上虚拟出一个 IP 地址，用户必须通过这个虚拟的 IP 地址访问服务。这个虚拟 IP 一般称为 LVS 的 VIP，即 Virtual IP。访问的请求首先经过 VIP 到达负载调度器，然后由负载调度器从 Real Server 列表中选取一个服务节点响应用户的请求。

当用户的请求到达负载调度器后，调度器如何将请求发送到提供服务的 Real Server 节点，而 Real Server 节点如何返回数据给用户，是 IPVS 实现的重点技术，这其中有三种方式：分别是 NAT、TUN 和 DR


LVS 主要通过向 Netfilter 的 3 个阶段注册钩子函数来对数据包进行处理，如下图

<div  align="center">
	<img src="../assets/lvs-netfilter.png" width = "580"  align=center />
</div>


- 在 LOCAL_IN 阶段注册了 ip_vs_in() 钩子函数: 在路由判决之后，如果发现数据包是发送给本机的，那么就调用 ip_vs_in() 函数对数据包进行处理。
- 在 FORWARD 阶段注册了 ip_vs_out() 钩子函数: 在路由判决之后，如果发现数据包不是发送给本机的，调用 ip_vs_out() 函数对数据包进行处理。
- 在 POST_ROUTING 阶段注册了 ip_vs_post_routing() 钩子函数: 在发送数据前，需要调用 ip_vs_post_routing() 函数对数据包进行处理

如数据转发的流程的实现：

- 当数据包进入到 DS 后，会被 LOCAL_IN 阶段的 ip_vs_in() 钩子函数进行处理。
- ip_vs_in() 函数首先查找客户端与真实服务器的连接是否存在，如果存在就使用这个真实服务器。否则通过调度算法对象选择一台最合适的 RS ，然后建立客户端与 RS 连接关系。
- 根据运行模式来选择发送数据的接口（如 NAT 模式 对应的是 ip_vs_nat_xmit() 函数），再把数据转发出去。
- 转发数据时，首先会根据真实服务器的 IP 地址更新数据包的路由信息，然后再更新各个协议头部的信息（如 IP 地址、端口和校验和等），然后把数据发送出去。