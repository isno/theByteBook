# 2.8 使用 QUIC 协议

2022 年 6 月 6 日，IETF QUIC 和 HTTP 工作组成员 Robin Mark 在推特上宣布：“历时 5 年，HTTP/3 终于被标准化为 RFC 9114”。HTTP/3 发布之后，有网友对各个版本的 HTTP 进行时延测试（从上海请求旧金山 HTTP 服务器）。最后的测试结果如下：HTTP/1.1 平均在 3500 ms，HTTP/2 平均在 2500 ms，而 HTTP/3 平均在 1300 ms。结果显示 HTTP/3 带来的性能提升明显。

<div  align="center">
	<img src="../assets/http3.png" width = "500"  align=center />
	<p>图2-11 HTTP 性能测试</p>
</div> 

HTTP/3 为何性能提升如此明显？想知道这个问题的答案，你得先了解 QUIC。
