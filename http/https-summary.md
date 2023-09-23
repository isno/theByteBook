# 3.4 HTTPS原理及SSL层优化实践

要进行SSL层优化，得先知道HTTPS是什么？简单理解就是 HTTP+SSL/TLS。

问题又来了，什么是SSL/TLS 呢？SSL（Secure Sockets Layer，安全套接字层协议）最初是由网景公司设计的Web安全协议，后经IETF进行升级和标准化，演变为现在的TLS（Transport Layer Security，传输层安全性协议）。

一般情况下将二者写在一起SSL/TLS，本文中的SSL层泛指TLS等安全协议。
