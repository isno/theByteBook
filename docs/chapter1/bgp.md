#互联网AS及BGP讲解

中小型局域网几百台、几千台可以用RIP、OSPF等路由协议组网，但互联网上亿台主机如何解决互联问题呢？

解决方式就是整个互联网按组织边界、管理边界等划分为多个自治系统（Autonomous System ，AS），每个自治系统由一组运行相同的路由协议、路由选择算法的路由器组成，由于AS的规模较小，路由算法不会产生性能问题。

<div  align="center">
	<p>图: AS网络</p>
	<img src="/assets/bgp.png" width = "400"  align=center />
</div>



一个运营商或者IDC机房想要进入互联网，需要在CNNIC或APNIC（国内）申请IP地址段和AS号，然后通过EGP协议将此段IP地址广播到到其他网络运营商参与互联。

EGP (Exterior Gateway Protocol)：AS之间的路由选择，EGP的代表性协议就是BGP（Border Gateway Protocol）。


###BGP简析

BGP可以说是最复杂的路由协议，在网络中，属于应用协议，传输层使用TCP，默认端口号是179。

BGP是唯一使用TCP作为传输层的路由协议，基于TCP连接的可靠性和互联网大量的路由信息（TCP连接的窗口是65K字节，也就是说TCP连接允许在没有确认包的情况下，连续发送65K的数据） BGP非常适合于大规模网络环境。

#### BGP工作原理

BGP基于（Path vector protocol）路径矢量来实现，每个BGP服务的实体叫做BGP Router，而与BGP router连接的对端叫BGP Peer。

BGP Router在收到了Peer传来的路由信息，会存储在自己的数据库。BGP router会根据自己本地策略(Policy)结合路由信息中内容判断处理，如果路由信息符合本地策略(Policy)，BGP Router会修改自己的主路由表。

本地策略(Policy)会有很多，如果BGP Router收到两条路由信息，目的网络一样，但是路径不一样，一个是AS1->AS3->AS5，另一个是AS1->AS2，如果没有其他的特殊策略(Policy)，BGP Router会选用AS1->AS2这条路由信息。由此BGP可以实现复杂的控制，以及更有保障性的网络。


#### AS子网应用讲解

使用MTR类的路由探测软件可以获取各个中间网络的AS号，根据AS号可以在网络中心获取该AS的一些基本信息，如建立的对等网络、所含CIDR、物理位置信息等等。。

如爱奇艺网络的AS为AS133865。 通过该网址获取AS信息 https://bgpview.io/asn/133865

<div  align="center">
	<p>图: 爱奇艺对等网络拓扑图</p>
	<img src="/assets/iqiyi-bgp.png" width = "400"  align=center />
</div>

以上的拓扑图可以看出，爱奇艺AS和中国电信、新加坡电信、香港网络... 等等做了众多的对等互联，可以说爱奇艺为提升用户体验，在网络建设中，付出了相当大的成本。

<div  align="center">
	<p>图: BGP机房冗余备份策略</p>
	<img src="/assets/bgp-connect.png" width = "500"  align=center />
</div>

另外就是判断一个机房的好坏，可以通过该机房所
建立的对等数判断，一个机房拥有了AS号，意味着拥有了与网络运营商同等级别的网络调度能力。建立的对等数越多，网络的互联性就越好，除此BGP机房还存在冗余备份、路由环路消除特点，在使用多线机房，我们常常会申请多个VIP（Virtual IP，某个线路出现问题时，再手动从DNS中摘除，相当麻烦，而使用BGP机房，只要一个VIP（Virtual IP）即可，当某个运营商至机房连通出现问题，其用户自动切换至其他线路。