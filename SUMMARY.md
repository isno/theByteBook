
1. 理解网络与优化指南
	- 理解网络原理
		- 理解 underlay 网络
		- 理解 SDN以及 overlay 网络
		- 云原生网络与网络虚拟化

	- 网络性能观测指南
		- 网络性能指标
		- 使用 mtr 观测网络延迟
		- 使用 tcpdump 进行网络分析

	- 基础网络优化实践
		- 网络层优化
		- 传输层优化
		- 使用动态代理加速

	- 移动端应用网络层设计指导
		- 请求接口的延迟分析
		- 使用 HTTP DNS 降低DNS解析延迟
		- 使用 HTTP/3  加速应用协议的连接和传输效率
		- 优化 SSL 层 TLS协议以及加密算法
		- 使用 brolti 对内容进行压缩

2. 负载均衡与网关的实践
	- 理解负载均衡
		- 负载均衡面临的挑战：从10K到10M 
		- L4负载均衡
		- L7负载均衡
	- LVS的应用指南
		- LVS 简介
		- 基于 OSPF + LVS 构建双活的L4负载均衡
		- 使用 DPVS 保障 C10M的并发场景

	- L7 负载均衡
		- Nginx 配置的优化指导

	- APIGateway 网关应用指南
		- 为什么要有APIGateway
		- APIGateway 技术选型
		- 使用 APISIX 构建大规模服务的网关系统

4. 从SOA到微服务


3. 容器化与云原生架构
	- 理解容器化
		- 理解 Linux namespace 资源分配
		- 理解 CNI
		- 镜像与容器 
		- 容器技术选型
	- Docker的应用指南
		- Dockerfile编写指南
		- 使用Nexus3搭建私有镜像仓库
	- 服务编排以及K8S
		- 服务编排的技术选型
		- 部署高可用的Kubernetes
		- 使用Gitlab、helm、Jenkins 在K8S 集群下持续集成与发布的实践
		- 使用 Prometheus 配合 Grafana 监控集群

	- 云原生下的架构演进
		- 微服务架构下的Sidecar
		- 从微服务到Serverless

4. 从降本提效到FinOps
	- FinOps是什么
	- FinOps的主要作用
	- FinOps阶段及循环方法论
	- FinOps的 KPI
	- FinOps成熟度模型
