#traceroute

要想查询两个节点之间经过了哪些路由，哪些线路怎么做？ 用traceroute！

traceroute是充分利用 ICMP 差错报文类型的应用，其主要用作追踪路由信息，它可以定位源主机到目标主机经过了那些路由器，以及到达各个路由器的耗时。
traceroute 用IP存活时间 (TTL) 字段和 ICMP 错误消息来确定从一个主机到网络上其他主机的路由。基本原理是向外发送带有逐次递增 TTL 的数据包从而获取的路径中每一跳的信息。

<div  align="center">
	<p>图:traceroute流程</p>
	<img src="/assets/traceroute.png" width = "500"  align=center />
</div>

源主机向目标主机做traceroute，源主机第一次会发送一个 TTL=1的数据包，当数据包到达Router1时，TTL变为0（网络中没经过一跳TTL会减去1），Router1会将 TTL=0的数据包丢弃并返回 ICMP Time Exceeded给源主机。接着源主机发送第二个数据包并将TTL增加1（TTL=2）, 该数据包到达Router2后，TTL=0，Router2向Source主机返回 ICMP Time Exceeded。以此类推，直到TTL增加到一个合适的值最终到达目标主机，目标主机会返回一个 Final Replay给源主机。

traceroute一共有三种实现方式:TCP、UDP、ICMP。UDP和ICMP traceroute的区别在于向外发送的数据包和最后的final replay不同。TCP traceroute 同样利用了 TTL 来探测网络路径，但是它向外发送的是 TCP SYN 数据包。这样做 TCP SYN 看起来是试图建立一个正常的 TCP 连接，可以更大几率穿透防火墙封闭ICMP返回信息。

## traceroute解析

假设想要知道当我们访问 http://www.iq.com 时，经过了多少中间节点，那么可以采用如下命令：

<div  align="center">
	<p>图:traceroute命令解析</p>
	<img src="/assets/traceroute-result.png" width = "500"  align=center />
</div>

### 结果解析

从命令结果可以看出：域名www.iq.com对应多个IP地址，这里采用了其中一个IP地址 23.219.172.240，对应的主机名是 e36827.a.akamaiedge.net。 从当前主机到目标主机，最多经过64跳（64 hops max），每次检测发送的包大小为52字节（52 byte packets）

具体的结果输出有多行，行首是序号，表示这是经过的第N个中间节点。序号后面是节点的主机名+IP地址。最后是到达节点所耗费的时间。一行多个IP的情况是因为路径不是唯一的，

注意：每次检测都同时发送3个数据包，因此打印出来三个时间。此外，如果某一个数据报超时没有返回，则时间显示为 `*`，返回  `*`存在多种情况，路由器限制ICMP速率。

通过以上的结果我们就可以判断网络质量、中间的设备是否正常等等。