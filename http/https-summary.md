# 3.4 HTTPS原理及SSL层优化实践

首先，我们来个最简单问题，HTTPS是什么？


所有的工作中，笔者感到最头疼之一的当属解决生产环境中的各类SSL错误。SSL层协议过于复杂，HTTPS 通信过程中，涉及了大量 TLS 握手、CA、数字证书、对称/非对称加密等技术栈。

:::tip <i></i>
从名字上来说，
TLS 是传输层安全性协议（英语：Transport Layer Security，缩写作 TLS）。
SSL 是安全套接字层协议（Secure Sockets Layer，缩写作 SSL）。
一般情况下将二者写在一起TLS/SSL，我们可以将二者看做同一类协议，只不过TLS是SSL的升级版。

最初SSL是网景公司设计的主要用于Web的安全传输协议，此时SSL只是一家公司的标准安全协议，后来一个致力于互联网标准开发与推动的组织IETF认为该协议不错，遂在SSL3.0的基础上将该协议进行升级并标准化（
RFC 2246），并命名为TLS（Transport Layer Security）

:::