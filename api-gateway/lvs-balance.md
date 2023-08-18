# 4.1.3 LVS 负载均衡算法

IPVS 在内核中的负载均衡调度是以连接为粒度的。在 HTTP 协议（非持久）中，每次从 Web 服务器上获取资源都需要建立一个 TCP 连接，同一用户的不同请求会被调度到不同的服务器上，所以这种细粒度的调度在一定程度上可以避免单个用户访问的突发性引起服务器间的负载不平衡。

LVS 分为两种调度方式：**静态调度**和**动态反馈调度**。

- 静态调度方式是指不管 RS 的繁忙程度，根据调度算法计算后轮到谁就调度谁。
	- 例如两台 rs，一开始双方都在处理 100 个连接，下一个请求到来前，rs1 只断开了 10 个，而 rs2 断开了 99 个，但此时轮到了 rs1 ，则就会调度 rs1 而不管rs1 的繁忙程度。
- 动态调度方式是指根据 RS 的繁忙程度反馈，计算出下一个连接应该调度谁。
	- 动态反馈负载均衡算法考虑服务器的实时负载和响应情况，不断调整服务器间处理请求的比例，来避免有些服务器超载时依然收到大量请求，从而提高整个系统的吞吐率。

在静态调度和动态反馈调度之上，IPVS 实现了下面八种负载均衡算法（默认的算法为 wlc）。

- **静态调度**：
	- 轮叫调度（Round-Robin Scheduling，rr）
	- 加权轮叫调度（Weighted Round-Robin Scheduling，wrr），按照权重比例作为轮询标准
	- 目标地址散列调度（Destination Hashing Scheduling，dh），目标地址哈希，对于同一目标 IP 的请求总是发往同一服务器
	- 源地址散列调度（Source Hashing Scheduling，sh），源地址哈希，在一定时间内，只要是来自同一个客户端的请求，就发送至同一个 realserver

- **动态反馈调度**：
	-	最小连接调度（Least-Connection Scheduling，lc），调度器需要记录各个服务器已建立连接的数目，当一个请求被调度到某服务器，其连接数加 1；当连接中止或超时，其连接数减 1。当各个服务器的处理能力不同时，该算法不理想。
	- 加权最小连接调度（Weighted Least-Connection Scheduling，wlc）
	- 基于本地的最少连接（Locality-Based Least Connections Scheduling，lblc），目前该算法主要用于 cache 集群系统。
	- 带复制的基于局部性最少连接（Locality-Based Least Connections with Replication Scheduling，lblcr），目前主要用于 Cache 集群系统。