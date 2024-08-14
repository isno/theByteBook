# 1.5.3 服务网格

服务网格（Service Mesh）的概念最早由 Buoyant CEO William Morgan 在 2016 年首次提出，2017 年 4 月该公司发布了第一个 Service Mesh 产品 Linkerd。 同年发表了文章《What’s a service mesh？And why do I need one?》[^1]，被公认是 Service Mesh 的权威定义。

:::tip 服务网格的定义

服务网格（ServiceMesh）是一个**基础设施层**，用于处理服务间通信。云原生应用有着复杂的服务拓扑，服务网格保证**请求在这些拓扑中可靠地穿梭**。在实际应用当中，服务网格通常是由一系列轻量级的**网络代理**组成的，它们与应用程序部署在一起，但**对应用程序透明**。

:::right
—— by William Morgan
:::

ServiceMesh 之所以称为服务网格，是因为每台节点同时运行着业务逻辑和具有流控能力的网络代理（例如 Envoy、Linkerd-proxy），这个代理被形象地称为 Sidecar（业务逻辑相当于主驾驶，处理辅助功能的代理相当于边车）。

:::center
  ![](../assets/sidecar-example.jpg)<br/>
  图 1-22 边车示例
:::

服务网格的关键在于 Sidecar 模式，服务网格将具有流控能力的网络代理以 Sidecar 的方式部署，各个微服务之间通过 Sidecar 发现和调用目标服务，从而在服务之间形成一种网络状依赖关系。

如果我们把节点和业务逻辑从视图剥离，就会出现如图 1-23 所示的网络状的架构，服务网格由此得名。

:::center
  ![](../assets/service-mesh.png)<br/>
  图 1-23 服务网格形象示例
:::

业内服务网格的产品通常由“数据平面”和“控制平面”两部分组成，以服务网格的代表实现 Istio 架构为例，如图 1-24 所示。

:::center
  ![](../assets/service-mesh-arc.svg)<br/>
  图 1-24 Istio 架构
:::

- 数据平面（Data plane）通常采用轻量级的网络代理（例如 Envoy）作为 Sidecar，网络代理负责协调和控制服务之间的通信和流量处理，解决微服务之间服务熔断、负载均衡、安全通讯等问题。
- 控制平面（Control plane）中包含多个组件，它们负责配置和管理 Sidecar ，并提供服务发现（Discovery）、配置管理（Configuration）、安全控制（Certificates）等功能。


值得一提的是，虽然服务网格都在使用 Sidecar 作为数据平面，但 Sidecar 模式并不是服务网格所特有的。Sidecar 一种常见的容器设计模式，Kubernetes 的工作负载 Pod 中可以运行多个容器，所有业务容器之外的其他容器都可以被称为 Sidecar，例如日志收集 Sidecar、请求代理 Sidecar、链路追踪 Sidecar 等等。

如图 1-25 所示，app-container 是一个主业务容器，longing-agent 是一个日志收集的容器。有了 longing-agent，主业务容器完全不需要关心日志怎么处理、怎么传送到后端、怎么对接到日志系统。你思考这样开发一个高内聚、低耦合的系统是否更加容易？

:::center
  ![](../assets/k8s-sidecar.png)<br/>
  图 1-25 Kubernetes Pod 中 Sidecar 容器收集应用日志，并转发至日志后端
:::

相信你已经清楚服务网格不是什么黑科技，也没有什么耀眼的新技术。

服务网格本质是通过 iptables 劫持发送到应用容器的流量，将原本在业务层要处理的分布式技术问题，下沉到具有流控能力的 Sidecar 中处理，实现业务与非业务逻辑解耦的目的。


[^1]: 参见 https://www.infoq.cn/news/2017/11/WHAT-SERVICE-MESH-WHY-NEED/