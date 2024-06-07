# 2.5 HTTPS 原理及 SSL 层优化实践

:::tip 什么是 SSL/TLS
SSL（Secure Sockets Layer，安全套接字层协议）最初是由网景公司设计的 Web 安全协议，后经 IETF 进行升级和标准化，演变为现在的 TLS（Transport Layer Security，传输层安全性协议），一般情况下将二者写在一起 SSL/TLS，本文中的 SSL 层泛指 TLS 等安全协议。
:::

SSL 在网络安全领域扮演着至关重要的角色，它不仅涵盖了证书、证书颁发机构（CA）、传输层安全协议（TLS）、以及对称和非对称加密等关键概念，而且还是实现高级安全模型，如零信任（Zero Trust）和双向 TLS（mTLS）的基础。

无论是 HTTPS 服务优化，还是后续章节中讨论的 Kubernetes 集群安全配置，只有掌握 SSL 加解密过程以及证书原理，此后面对安全策略设计、处理证书等各类杂症才能游刃有余。




