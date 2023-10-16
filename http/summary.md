# 第二章: 构建”足够快“的网络服务

相信大部分读者知晓一道经典的面试题“浏览器打开 url 到页面展现，中间发生了什么？”，面试官通常用这道题来考察候选者对网络知识掌握的广度和深度。那我们不妨就根据这道面试题的思路出发，通过解析 HTTP 类型的应用服务，逐步探究 DNS、HTTP、SSL、QUIC 和传输层等各个环节原理以及该如何一步步构建“足够快”的网络服务。

<div  align="center">
	<img src="../assets/http-summary.png" width = "550"  align=center />
</div>