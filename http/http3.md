# 2.5 快速 UDP 网络连接

2022年6月6日，IETF QUIC 和 HTTP 工作组成员 Robin Mark 在推特上宣布，历时5年，HTTP/3 终于被标准化为 RFC 9114[^1]，这是 HTTP 超文本传输协议的第三个主要版本，HTTP/3 终于标准化。

<div  align="center">
	<img src="../assets/http3-11.png" width = "500"  align=center />
	<p>图2-11 HTTP/3 正式发布</p>
</div> 

HTTP/3 发布之后，有网友对各个版本的HTTP进行时延测试（从上海请求旧金山HTTP服务器）。最后的测试结果如下：HTTP/1.1 平均在 3500 ms，HTTP/2 平均在 2500 ms，而 HTTP/3 平均在 1300 ms。可以看到 HTTP/3 带来的性能提升还是很明显的。

<div  align="center">
	<img src="../assets/http3.png" width = "500"  align=center />
	<p>图2-12 HTTP3 测试</p>
</div> 

HTTP/3 为何性能提升如此明显？想知道这个问题的答案，你得先了解 QUIC。

[^1]: 参见 https://www.rfc-editor.org/info/rfc9114