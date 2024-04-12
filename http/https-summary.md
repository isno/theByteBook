# 2.5 HTTPS 原理及 SSL 层优化实践

SSL 在安全领域非常重要，其中涉及了证书、CA、TLS、对称/非对称加密等各个概念，更是上层的应用 Zero Trust（零信任安全模型）、mTLS（Mutual TLS，双向 TLS）等的实现基础。

无论是 HTTPS 服务优化，还是后面章节所提及的 Kubernetes 证书，安全配置等，唯有晓通 SSL 原理，此后安全策略设计、处理证书等各类杂症才能游刃有余。

:::tip 什么是 SSL/TLS

SSL（Secure Sockets Layer，安全套接字层协议）最初是由网景公司设计的 Web 安全协议，后经 IETF 进行升级和标准化，演变为现在的 TLS（Transport Layer Security，传输层安全性协议），一般情况下将二者写在一起 SSL/TLS，本文中的 SSL 层泛指 TLS 等安全协议。

:::


