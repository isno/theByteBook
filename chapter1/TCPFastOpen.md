#TCP Fast Open连接复用

TCP快速打开（TCP Fast Open, TFO） 是TCP中简化握手流程的拓展机制，用于提高建立连接速度，在一些高延迟的环境中，通常可以提升25%左右效率。目前在大部分系统中，均已支持TFO特性。

常规的TCP连接需要经历三次握手，对于向同一个主机多次短连接较为浪费资源。使用TFO后，对已经连接过的主机，可以使用之前的Cookie复用连接，避免了无谓的重复握手过程。


<div  align="center">
	<p>图1:TCP Fast Open连接复用流程</p>
	<img src="/assets/tcpfastopen.png" width = "400" alt="图片名称" align=center />
</div>

TFO的机制主要分为两个部分：获取TCP连接Cookie，以及在后续的新连接总复用Cookie简化连接流程。


**获取TCP连接Cookie：**
 * 客户端发送SYN数据包，该数据包包含Fast Open选项，且该选项的Cookie为空，这表明客户端请求Fast Open Cookie
 * 支持TCP Fast Open的服务器生成Cookie，并将其置于SYN-ACK数据包中的Fast Open选项以发回客户端；
 * 客户端收到SYN-ACK后，缓存Fast Open选项中的Cookie。

**新连接复用Cookie：**

假定客户端在此前的TCP连接中已完成请求Fast Open Cookie的过程并存有有效的Fast Open Cookie
 * 客户端发送SYN数据包，该数据包包含数据以及此前记录的Cookie
 * 支持TCP Fast Open的服务器会对收到Cookie进行校验：如果Cookie有效，服务器将在SYN-ACK数据包中对SYN和数据进行确认（Acknowledgement），服务器随后将数据递送至相应的应用程序；否则，服务器将丢弃SYN数据包中包含的数据，且其随后发出的SYN-ACK数据包将仅确认（Acknowledgement）SYN的对应序列号
 * 如果服务器接受了SYN数据包中的数据，服务器可在握手完成之前发送数据
 * 客户端将发送ACK确认服务器发回的SYN以及数据，但如果客户端在初始的SYN数据包中发送的数据未被确认，则客户端将重新发送数据
 * 此后的TCP连接和非TFO的正常情况一致

**在服务器中开启 TFO**

TFO是TCP协议的实现性质更新，所以协议要求TCP实现默认禁止TFO。

在Linux中开启TFO（注意：Linux kernel 3.7.1 及以上才支持 TCP Fast Open）

```
sysctl net.ipv4.tcp_fastopen = 3

```
选项值：0 默认 1 客户端开启 2 服务端开启 3 双向启用

开启后，可用下面命令查看运行情况

```
grep '^TcpExt:' /proc/net/netstat | cut -d ' ' -f 87-92 | column -t
```

**在互联网开启TFO的可行性**

由于TFO是一项对 TCP 协议的实验性扩展，中间网络设备有可能不支持该特性，比方说部分防火墙（NAT）会直接将带有数据段的SYN 包认为是非法数据包直接抛弃， 这就导致使用TFO的话就完全无法建立连接。

为了解决这种问题，操作系统另外引入 blackhole 机制，当对某 IP 以 TFO 进行握手时，如果在特定时间内都没有收到回应，那么就重新尝试以非 TFO 方式进行握手，如果成功，则将该 IP 加入黑名单，之后再也不以 TFO 进行握手。


国外技术人员在2015年对年对18个国家、22个ISP环境下进行TFO的测试数据，测试结果表明只有2.18%的SYN数据包会被直接丢弃，引起重传 （也有可能是网络堵塞造成的重传）。


<div  align="center">
	<p>图2:TFO 连通性测试</p>
	<img src="/assets/tfo-test.png" width = "500" alt="图片名称" align=center />
</div>
