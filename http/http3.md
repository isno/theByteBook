# 2.8 使用新一代的传输协议 QUIC

2022 年 6 月 6 日，IETF QUIC 和 HTTP 工作组成员 Robin Mark 在推特上宣布：「历时 5 年，HTTP/3 终于被标准化为 RFC 9114」，这对于 HTTP 演进意义重大。

HTTP/3 发布之后，国内有位工程师使用基准测试的方法对各个版本的 HTTP 协议进行基准测试（从上海请求旧金山 HTTP 服务器）[^1]，总结测试结果：「HTTP/1.1 平均在 3500 ms，HTTP/2 平均在 2500 ms，而 HTTP/3 平均在 1300 ms」，数据证明 HTTP/3 带来的性能提升明显。

:::center
  ![](../assets/http3.png)<br/>
  图 2-31 HTTP 各个版本的基准测试
:::

HTTP/3 的性能为何提升如此明显？带着这个疑问，我们进入「快速 UDP 网络连接」这一节。

[^1]: 出处《从旧金山到上海, HTTP/3 非常快! 》，https://www.cnblogs.com/myshowtime/p/16227260.html