# QUIC协议

QUIC全称为Quick UDP Internet Connection（快速UDP互联网连接)， 是一种新的“更快”的通用网络传输协议。相比于TCP和TLS，QUIC提供了许多改进 如与TLS的结合、更灵活的拥塞控制、多路复用等来提升网络传输的性能。


随着QUIC协议的标准化，QUIC之上的HTTP/3协议已经被众多浏览器所支持，其中包括Chrome、Microsoft Edge(Chrome内核版本)、Firefox和Safari，除了浏览器也有不少客户端APP也开始支持和使用HTTP/3。


<div  align="center">
	<p>QUIC协议的诞生</p>
	<img src="/assets/chapter2/quic-dev.png" width = "650"  align=center />
</div> 


### QUIC协议的现状 

QUIC协议的产生与今天的互联网应用场景和传输性能密切相关。在互联网和HTTP发展的过程中，HTTP底层协议大体上来说基本没变。但是，随着海量移动设备推高互联网流量，越来越多的应用场景需要低延迟、高吞吐、应用QoS感知的网络传输等，原来的HTTP协议在提供流畅、高效的Web访问方面越来越难以满足应用需求。


**QUIC的一切特性始于“构建在UDP之上”**

“构建在UDP之上”意味着可以不关心内核或者不用深入了解内核的开发，也可以灵活地调整可靠传输机制和拥塞控制算法等，这极大地方便了各种对传输QoS敏感的应用，比如实时音视频传输、在线游戏等。

QUIC的主要特性有如下一些：

- 选择UDP也能让QUIC协议不依赖网络中间设备Middle-Boxes做调整。
- TCP协议的开发、调试、观测的困难问题也会迎刃而解，无需通过复杂的BPF（Berkeley Packet Filter）来采集和调试协议栈程序，只需在用户态部署简单的数据收集程序。
- 应用程序的崩溃问题也不至于影响系统内核，而且可以留足崩溃现场做后续分析。
- 用户态有更多的程序库帮我们实现更复杂、更全面的策略，比如自适应CC（Congestion Control）算法。
- 利用UDP的数据包无序列依赖，QUIC多数据流之间多路复用，无队首阻塞问题，并且各自有独立的流控（Flow Control）。
- 耦合3实现0-RTT建连，连接复用。
- 用户态实现和网络五元组无关的连接标识ID，ConnectionID，实现连接迁移，以及后续的多路径（Multipath QUIC）。 

**QUIC的使用量稳步提升中**

随着QUIC v1版协议标准的出现，越来越多的网站开始使用QUIC流量，根据W3Techs的统计显示，目前大概有26.1%的网站使用了HTTP/3。

<div  align="center">
	<p>图：HTTP/3 应用占比</p>
	<img src="/assets/chapter2/http3-stat.png" width = "550"  align=center />
</div> 

### QUIC的支持情况

<div  align="center">
	<p>部分开源QUIC协议栈列表</p>
	<p>数据来源：https://github.com/quicwg/base-drafts/wiki/Implementations*</p>
	<img src="/assets/chapter2/quic-list.webp" width = "600"  align=center />
</div> 

### 阻碍QUIC发展的一些问题 

无论是在客户端还是服务端，QUIC协议的集成并非一件易事。如果当前使用的网络不支持QUIC，意味着我们需要修改应用程序来适配网络库的调整。这往往并不是应用迭代的出发点。下面让我们来看看客户端和服务端在集成QUIC协议时需要考虑的问题：

**客户端的问题**

- 应用适配成本和收益之间的权衡。
- 过渡期可能还需要新旧网络库都存在，方便降级容错，增加应用体积。
- 不同的QUIC库的接口并不统一，不像Socket统一接口具备移植性。

**服务端的问题**

- 网络事件模型需要适配QUIC协议栈做调整，同时还要考虑和TCP的兼容。
- 后端架构面临调整，4层Load Balancer是否支持QUIC，HTTP/3的QUIC流量如何换成HTTP/1转给Backend Service。
- 需要考虑到多Region、多节点之间的QUIC连接复用和连接迁移。
- 服务端QUIC流量的能耗比，如何做到和TCP一样的能耗性能。

<div  align="center">
	<img src="/assets/chapter2/quic-cpu.jpeg" width = "500"  align=center />
</div> 

**QUIC协议栈性能问题**

对比已经发展了三十多年的TCP协议，新兴的QUIC协议在协议栈实现的工程上还有很多优化的事情要做，根据Google 2017年公开的数据可以看到，当时QUIC同等流量的CPU消耗是TCP的2倍之多。QUIC协议栈的性能痛点主要有： UDP数据包收发性能、数据装包、拆包处理性能、数据包解析性能、ACK处理性能、加、解密性能、其他流程处理的性能：数据包Pacing、CC算法、内存使用等 

** UDP数据包性能问题**

UDP数据包在内核接收发送上一直没有得到和TCP数据包一样的优化待遇，UDP收发占据了QUIC协议栈比较大的消耗。

- 原始的sendto/write的UDP Socket接口性能很弱
- 批量收发数据sendmsg/sendmmsg提升不够明显
- 内核GRO/GSO可以提升性能，但还不够
- 内核XDP或者DPDK可大幅提升性能，但程序改造量极大
- 硬件NIC Offload UDP收发能终极优化，同样程序改造量极大

<div  align="center">
	<img src="/assets/chapter2/quic-eff.jpeg" width = "500"  align=center />
</div> 

上图是Google在2020年统计的QUIC能耗情况[8]：相比于TCP/SSL，QUIC有20%的额外消耗。不过相信随着更多的优化方案的实施，QUIC和TCP的流量能耗会趋于一致。



#### UDP被运营商QoS限制

结合我们部署的QUIC协议运行情况来看，HTTP/3较于HTTP/1等有更高的失败率，这里面有存在运营商对UDP流量QoS的影响。运营商这么做主要基于两个原因：

- UDP流量五元组在NAT状态上连接老化的时间控制不够精确，时间设置太长会破坏低频通信的UDP连接，太短会导致UDP连接消耗比较多的设备性能。一般会选择一个折中的经验值，这就会伤害一些特定场景的UDP流量了。
- 运营商设备上包分类的优先级队列对于UDP五元组的管理比较困难，因为UDP的五元组会频繁变动，只能眼睁睁看着UDP流量挤占各级队列，却没办法实施精确地控制。一般来说，运营商会在特定时间段或者特定负载情况下对UDP流量做全局限制。


