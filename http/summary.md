# 第三章: 应用层服务原理及优化指南

应用层服务包括 DNS、HTTP、SSL 以及相关的连接传输等技术，这一层服务是程序员直接面向的`网络层`，各类的服务治理问题（请求延迟过高、接口time out、HTTP 500 错误等）也集中在这一层。

本章节通过讲解 HTTP 类的应用服务，逐步分解 DNS、HTTPS、QUIC、SSL层等各个阶段运作流程，向读者概述如何应用、改善此类服务。

<div  align="center">
	<img src="../assets/http-summary.png" width = "550"  align=center />
</div>