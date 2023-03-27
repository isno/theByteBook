
1. 理解网络与优化指南
	- 网络性能观测指南
		- 网络性能指标
		- 使用 mtr 观测网络延迟
		- 使用 tcpdump 进行网络分析
	- 理解Underlay网络
		- BGP与AS自治系统
		- 理解TCP拥塞控制
		- iptables与netfilter
		- underlay网络优化指南
	- Linux网络虚拟化
		- 网络虚拟化的基础：network namespace
		- 网络虚拟设备：veth pair
		- 解决不同netns之间的通信：Linux bridge
		- 数据中心组网：VxLan
	- 移动端应用网络层设计指导
		- 请求接口的延迟分析
		- 使用 HTTP DNS 降低DNS解析延迟
		- 使用 HTTP/3  加速应用协议的连接和传输效率
		- 优化 SSL 层 TLS协议以及加密算法
		- 使用 brolti 对内容进行压缩

2. 让服务井然有序：负载均衡与网关
	- 理解负载均衡
		- 为什么要使用负载均衡
		- 负载均衡面临的挑战：从C10K到C10M 
	- LVS的应用指南
		- LVS 简介
		- 基于 OSPF + LVS 构建双活的生产级L4负载均衡
		- 基于 DPVS 保障 C10M的并发场景
	- APIGateway 网关应用指南
		- 为什么要有APIGateway
		- APIGateway 技术选型
		- 使用 APISIX 构建大规模服务的生产级网关

3. 从SOA到微服务架构
	- 为什么要使用微服务架
	- 微服务架构的技术选型
	- 引入微服务带来的问题
		- 数据一致性问题
		- 分布式问题
		- 复杂度问题
	- 微服务治理的实践指南
		- 链路追踪的设计与开发
		- 服务熔断、限流的设计指南
		- 基于 Nacos 搭建环境隔离配置中心 

4. 分布式存储与中间件
	- 分布式理论体系
		- 分布式中的CAP问题
		- 分布式中数据一致性的问题
	- 分布式存储系统
		- NoSQL存储系统
	- 解耦系统：使用消息中间件
		- 为什么要使用中间件
		- 中间件的技术选型
		- 
5. 容器化与云原生架构
	- 理解容器化
		- 理解 cgroup 技术 
		- 镜像与容器 
		- CRI 与 docker 与 K8S 
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

5. 系统安全与监控
	

7. 从降本提效到FinOps
	- FinOps是什么
	- FinOps的主要作用
	- FinOps阶段及循环方法论
	- FinOps的 KPI
	- FinOps成熟度模型
