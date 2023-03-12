# HTTP/2的应用

HTTP/2最大的亮点在于多路复用，而多路复用的好处只有在http请求量大的场景下才明显，所以有人会觉得只适用于浏览器浏览大型站点的时候。这么说其实没错，但HTTP/2的好处不仅仅是multiplexing，请求压缩，优先级控制等等都是亮点。对于内容型移动端app来说，有大量的http请求量大，多路复用还是能产生明显的体验提升。


HTTP/2的设计之初是不改动HTTP的语义，HTTP方法、状态码、URI及首部字段等核心概念，即不期望像用户暴露出HTTP2实现的复杂性。HTTP/2依然与HTTP/1.x保持一致，使用http和https来完成请求，前者对应于h2c(Http2 over cleartext TCP)，后者则对应于h2(Http2 over TLS)。


所以在发起Http请求时，对于HTTP/2和HTTP/1.1没有任何区别。对于同样的URI:https://www.iq.com或者http://www.iq.com，客户端在发起新请求之前，必须能发现服务器及所有设备是否支持HTTP/2协议，这就依赖于双端对于协议的协商机制了。


#### HTTP/2协商

TTP/2协议包含两种实现类型：h2C，基于常规的非加密信道建立的HTTP/2的连接；h2，基于TLS协议建立起来的HTTP/2的连接。针对h2C和h2，协商的方式是不同的。


##### h2c的升级协商

为了更方便地部署新协议，HTTP/1.1 引入了 Upgrade 机制，它使得客户端和服务端之间可以借助已有的 HTTP 语法升级到其它协议。
要发起 HTTP/1.1 协议升级，客户端必须在请求头部中指定这两个字段：
```
Connection: Upgrade
Upgrade: protocol-name[/protocol-version]
```

如果服务端不同意升级或者不支持 Upgrade 所列出的协议，直接忽略即可（当成 HTTP/1.1 请求，以 HTTP/1.1 响应）；如果服务端同意升级，那么需要这样响应：

```
HTTP/1.1 101 Switching Protocols
Connection: upgrade
Upgrade: protocol-name[/protocol-version]

[... data defined by new protocol ...]
```


这个机制就是用来 HTTP/1.1 到 HTTP/2 的协议升级。例如：

```
GET / HTTP/1.1
Host: example.com
Connection: Upgrade, HTTP2-Settings
Upgrade: h2c
HTTP2-Settings: <base64url encoding of HTTP/2 SETTINGS payload>
```


在 HTTP Upgrade 机制中，HTTP/2 的协议名称是 h2c，代表 HTTP/2 ClearText。如果服务端不支持 HTTP/2，它会忽略 Upgrade 字段，直接返回 HTTP/1.1 响应，例如：

```
HTTP/1.1 200 OK
Content-Length: 243
Content-Type: text/html
```

如果服务端支持 HTTP/2，那就可以回应 101 状态码及对应头部，并且在响应正文中可以直接使用 HTTP/2 二进制帧：

```
HTTP/1.1 101 Switching Protocols
Connection: Upgrade
Upgrade: h2c

[ HTTP/2 connection ... ]

```

下图是通过nghttp2分析HTTP1.x升级到HTTP/2的细节：

<div  align="center">
	<img src="/assets/chapter2/http2-4.jpeg" width = "320"  align=center />
</div>

##### h2的升级协商

基于TLS的HTTP/2协商则依赖于ALPN协商机制。起初，Google在SPDY协议中开发了一个名为NPN(Next Protocol Negotiation，下一代协商)的TLS扩展，随着SPDY被HTTP/2所取代，NPN也被修订为ALPN(Application Layer Protocol Negotiation，应用层协议协商)。


在TLS握手阶段，通信双方原本就要进行加密套件等的协商，ALPN作为起拓展加入握手协商过程中，对通信不会增添性能影响。


下图通过Wireshark对HTTP/2的连接建立过程进行分析：

<div  align="center">
	<img src="/assets/chapter2/http2-5.jpeg" width = "620"  align=center />
</div>

从上面wireShark的抓包分析来看，客户端在建立TLS连接的Client Hello握手中，通过ALPN扩展列出了自己支持的各种应用层协议。

<div  align="center">
	<img src="/assets/chapter2/http-6.jpeg" width = "620"  align=center />
</div>

如果服务端支持h2的话，会在server Hello中指定ALPN的结果为h2.随着TLS连接建立成功，便可以进行HTTP2.0的系列请求了。

<div  align="center">
	<img src="/assets/chapter2/http-7.jpeg" width = "620"  align=center />
</div>

如果不支持，会从客户端的ALPN列表中选一个自己支持的(HTTP/1.1)。随后的请求都基于HTTP/1.1来完成。
