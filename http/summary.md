# 第二章: 构建”足够快“的网络服务

应用层服务也被称为用户端网络，包括DNS、HTTP、SSL和相关的连接传输等技术。这是程序员需要直接处理的`网络层`，大部分产品关注的服务质量问题（例如请求延迟过高、接口超时、HTTP 500 错误等）也主要出现在这一层。

在本章节中，我们将通过解析HTTP类型的应用服务，逐步深入到DNS、HTTPS、QUIC和SSL等各个过程环节，并向读者阐述如何构建“足够快”的网络服务。

<div  align="center">
	<img src="../assets/http-summary.png" width = "550"  align=center />
</div>