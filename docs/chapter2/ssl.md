#为什么要有HTTPS


HTTP/1.1 有以下安全性问题：

- 使用明文(不加密)进行通信，内容可能会被窃听；
- 不验证通信方的身份，通信方的身份有可能遭遇伪装；
- 无法证明报文的完整性，报文有可能遭篡改。
- 由于 HTTP 设计之初没有考虑到这几点，所以基于 HTTP 的这些应用都会存在安全问题。


基于 TCP/IP 的网络，网络各处都会存在被监听的风险。而且如果用 HTTP 协议进行通信，HTTP 本身没有加密功能，所以也无法做到对通信整体进行加密。

<div  align="center">
	<img src="/assets/chapter2/https-1.png" width = "400"  align=center />
</div> 

就算是加密通信，也能被监听到通信内容，只不过监听者看到的是密文。要解决 HTTP 上面 3 个大的安全问题，第一步就是要先进行加密通信。于是在传输层增加了一层 SSL（Secure Sockets Layer 安全套接层）/ TLS (Transport Layer Security 安全层传输协议) 来加密 HTTP 的通信内容。


HTTPS (HTTP Secure) 并不是新协议，而是 HTTP 先和 SSL（Secure Sockets Layer 安全套接层）/ TLS (Transport Layer Security 安全层传输协议) 通信，再由 SSL/TLS 和 TCP 通信。也就是说 HTTPS 使用了隧道进行通信。


<div  align="center">
	<img src="/assets/chapter2/ssl-tls.png" width = "500"  align=center />
</div> 

### SSL/TLS的发展

能让 HTTPS 带来安全性的是其背后的 TLS 协议。它源于九十年代中期在 Netscape 上开发的称为安全套接字层(SSL)的协议。到 20 世纪 90 年代末，Netscape 将 SSL 移交给了 IETF，IETF 将其重命名为 TLS，并从此成为该协议的管理者。许多人仍将 Web 加密称作 SSL，即使绝大多数服务已切换到仅支持 TLS。

<div  align="center">
	<img src="/assets/chapter2/tls-time.png" width = "500"  align=center />
</div> 


- 1995: SSL 2.0. 由 Netscape 提出，这个版本由于设计缺陷，并不安全，很快被发现有严重漏洞，已经废弃。
- 1996: SSL 3.0. 写成 RFC，开始流行。目前（2015年）已经不安全，必须禁用。
- 1999: TLS 1.0. 互联网标准化组织 ISOC 接替 NetScape 公司，发布了 SSL 的升级版 TLS 1.0 版。
- 2006: TLS 1.1. 作为 RFC 4346 发布。主要 fix 了 CBC 模式相关的如 BEAST 攻击等漏洞。
- 2008: TLS 1.2. 作为 RFC 5246 发布。增进安全性。
- 2018：8月10日 RFC8446 TLS 1.3 协议正式发布，它剔除了 TLS 1.2 协议中不安全的因素，极大地增强了协议的安全性和性能。【请确保你使用的是这个版本】

在 IETF 中，协议被称为 RFC。TLS 1.0 是 RFC 2246，TLS 1.1 是 RFC 4346，TLS 1.2 是 RFC 5246。现在，TLS 1.3 为 RFC 8446。从 TLS 1.2 到 TLS 1.3，前前后后花了快 10 年的时间。