# 2.8 QUIC 协议的设计原理与应用实践

QUIC（Quick UDP Internet Connection，快速 UDP 网络连接）是一种基于 UDP 封装的安全、可靠传输协议，其设计目标是取代 TCP 作为主要的传输协议。

许多人可能认为是 IETF（互联网工程任务组）在推动 QUIC 替代 TCP。实际上，QUIC 的开发先驱是 Google。早在 2013 年，Google 就在其服务器（如 Google.com、YouTube.com）和 Chrome 浏览器中启用了名为 “QUIC”（业内称为 gQUIC）的全新传输协议。

到了 2015 年，Google 将 gQUIC 提交给 IETF，随后 IETF 规范化后的 QUIC 被称为 iQUIC。在早期阶段，iQUIC 有多个“草稿”版本，如 h3-27、h3-29 和 h3 v1 等。在 2018 年末，IETF 发布了基于 QUIC 协议的最新一代的互联网标准 HTTP/3。

图 2-26 展示了各个 HTTP 协议的区别。可以看出，HTTP/3 最大的特点是底层基于 QUIC 协议，并在内部集成了 TLS 协议。

:::center
  ![](../assets/http-quic.png)<br/>
 图 2-26 各个版本的 HTTP 协议对比
:::