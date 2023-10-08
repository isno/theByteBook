# 2.5 HTTPS 原理及 SSL 层优化实践

要进行 SSL 层优化，得先知道 HTTPS 是什么？简单理解就是 HTTP+SSL/TLS。

问题又来了，什么是 SSL/TLS 呢？SSL（Secure Sockets Layer，安全套接字层协议）最初是由网景公司设计的 Web 安全协议，后经 IETF 进行升级和标准化，演变为现在的 TLS（Transport Layer Security，传输层安全性协议），一般情况下将二者写在一起 SSL/TLS，本文中的 SSL 层泛指 TLS 等安全协议。
