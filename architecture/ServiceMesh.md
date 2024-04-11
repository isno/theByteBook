# 1.5.3 服务网格

服务网格（Service Mesh）的概念最早由 Buoyant CEO William Morgan 在 2016 年首次提出，2017 年 4 月该公司发布了第一个 Service Mesh 产品 Linkerd。 同年发表了文章《What’s a service mesh？And why do I need one?》[^1]，被公认是 Service Mesh 的权威定义。

:::tip 服务网格的定义

服务网格（ServiceMesh）是一个**基础设施层**，用于处理服务间通信。云原生应用有着复杂的服务拓扑，服务网格保证**请求在这些拓扑中可靠地穿梭**。在实际应用当中，服务网格通常是由一系列轻量级的**网络代理**组成的，它们与应用程序部署在一起，但**对应用程序透明**。

:::right
—— by William Morgan

:::

ServiceMesh 之所以称为服务网格，是因为每台节点同时运行着业务逻辑和代理，这个代理被形象地称为 Sidecar（业务逻辑相当于主驾驶，共享一个代理相当于边车）。服务之间通过 Sidecar 发现和调用目标服务，从而在服务之间形成一种网络状依赖关系。如果我们把节点和业务逻辑从视图剥离，就会出现一种网络状的架构，如图 1-23 所示，服务网格由此得名。

<div  align="center">
	<img src="../assets/service-mesh.png" width = "580"  align=center />
	<p>图1-23 服务网格形象示例</p>
</div>

业内服务网格的实现通常由「数据平面」和「控制平面」两部分组成。以服务网格的代表实现 Istio 架构为例，如图 1-24 所示：

<div  align="center">
	<img src="../assets/service-mesh-arc.svg" width = "520"  align=center />
	<p>图1-24 Istio 架构</p>
</div>

- 数据平面（Data plane）通常采用轻量级的代理（例如 Envoy）作为 Sidecar，这些代理负责协调和控制服务之间的通信和流量处理。
- 控制平面（Control plane）负责配置和管理数据平面，并提供服务发现、智能路由、流量控制、安全控制等功能。


服务网格的关键在于 Sidecar 模式。服务网格将具有流控能力的代理以 Sidecar 部署，从而组成了网格数据平面的基本形态。

典型的服务网格都在使用 Sidecar 作为数据平面，但 Sidecar 模式并不是服务网格所特有的。Sidecar 本来就是一种常见的容器设计模式，Kubernetes 的 Pod 提供的多容器支持，所有伴随应用容器部署的其他容器都可以被称为 Sidecar，如日志收集、追踪代理等，如图 1-24 所示。

<div  align="center">
	<img src="../assets/k8s-sidecar.png" width = "420"  align=center />
	<p>图1-24 Kubernetes Pod 中 Sidecar 容器收集应用日志，并转发至日志后端</p>
</div>

如此，相信你已经清楚服务网格不是什么黑科技，也没有什么耀眼的新技术。本质是通过 iptables 劫持发送到应用容器的流量，再转发给代理性质的 Sidecar，实现对流量的全方位控制、业务与非业务的逻辑解耦，以此彻底解决以 Spring Cloud 为代表的第二代微服务框架所面临的本质问题（详细解读请参阅本书第八章内容 ）。

[^1]: 参见 https://www.infoq.cn/news/2017/11/WHAT-SERVICE-MESH-WHY-NEED/
[^2]: 参见 https://istio.io/v1.15/blog/2021/proxyless-grpc/
[^3]: 参见 https://istio.io/latest/zh/blog/2023/ambient-merged-istio-main/
 
