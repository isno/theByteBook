# 2.8 QUIC 协议的设计原理与应用实践

QUIC (Quick UDP Internet Connection，快速 UDP 网络连接) 是一种基于 UDP 封装的安全、可靠传输协议，它的目标是取代 TCP 成为标准且效率更高的安全传输协议。

大部分人都会以为是 IETF（Internet Engineering Task Force，互联网工程任务组）在推动 QUIC 替换 TCP 协议，实际上推动的先驱是 Google 公司。早在 2013 年，Google 在它的服务器（如 Google.com、youtube.com）和 Chrome 浏览器中启用了名为“快速 UDP 网络连接（QUIC）”的全新传输协议，该协议业内一般称 gQUIC。

2015 年，Google 将 gQUIC 提交给 IETF，IETF 规范后的 QUIC 协议称 iQUIC，早期 iQUIC 有 h3-27、h3-29 和 h3 v1 等多个“草稿”版本。2018 年末，IETF 推出了最新一代的互联网标准 HTTP/3。图 2-26 展示了各个版本的 HTTP 协议对比。可以看到，HTTP/3 最大的特点是使用 QUIC 协议，并在内部集成 TLS 协议。

:::center
  ![](../assets/http-quic.png)<br/>
 图 2-26 各个 HTTP 协议对比：HTTP/3 基于 UDP，并利用 QUIC 实现了安全、可靠的数据传输
:::