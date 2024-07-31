# 2.5.2 升级 TLS 1.3 协议

HTTPS 建立连接的过程中，TLS 握手阶段最长可以花费 2-RTT。不做任何优化措施情况下，HTTPS 中 TLS 的握手耗时和加解密耗时会让 HTTPS 延迟比 HTTP 慢上几百毫秒，弱网环境下，HTTPS 延迟问题会更加明显。

如果使用 TLS 1.2 协议，如图 2-17 所示，需要 2-RTT 完成握手，然后才能开始传输数据。

:::center
  ![](../assets/tls1.2.png)<br/>
 图 2-17 TLS1.2 协议握手过程 [图片来源](https://www.wolfssl.com/tls-1-3-performance-part-2-full-handshake-2/)
:::

最新的 TLS 1.3 协议放弃了安全性较低的加密功能的支持，并改进了握手流程。TLS 1.3 协议中的 **握手只需要一次 RTT 而不是两次，如果客户端复用之前连接，TLS 握手的 RTT 次数甚至为零**。这意味着如果使用 TLS 1.3 协议，HTTPS 请求至少减少一个 RTT 的延迟时间。

:::center
  ![](../assets/tls1.3.png)<br/>
 图 2-18 TLS 1.3 协议的握手过程
:::


