# 2.8 使用新一代的传输协议 QUIC

2022 年 6 月 6 日，IETF QUIC 和 HTTP 工作组成员 Robin Mark 在推特上宣布：“历时 5 年，HTTP/3 终于被标准化为 RFC 9114”，这对于 HTTP 演进意义重大。

HTTP/3 正式推出后，网络中一位工程师对不同版本的 HTTP 进行了一项延迟测试（客户端位于上海，服务器位于旧金山）。测试结果显示，使用 HTTP/1.1 协议的平均响应时间为 3,500 ms，HTTP/2 将这一数字缩短至 2,500 ms，而最新的 HTTP/3 协议则显著提高了性能，平均响应时间仅为 1,300 ms。

:::center
  ![](../assets/http3.png)<br/>
  图 2-25 长距离通信下 HTTP 各个版本的延迟测试 [图片来源](https://www.cnblogs.com/myshowtime/p/16227260.html)
:::

HTTP/3 的性能为何提升如此明显？带着这个问题，我们来了解 HTTP/3 背后的可靠链接协议 QUIC ，以及 QUIC 对比传统 TCP 协议的种种优势。