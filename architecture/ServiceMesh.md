# 1.5.3 服务网格

服务网格（Service Mesh）的概念最早由 Buoyant 公司的创始人 William Morgan 于 2016 年提出。

2017 年 4 月，该公司发布了首个服务网格产品 Linkerd。同年，Morgan 的文章《What’s a service mesh? And why do I need one?》[^1]在互联网中开始广泛流传，这篇文章内的解读被认定为服务网格的权威定义。

:::tip 服务网格的定义

服务网格（ServiceMesh）是一个**基础设施层**，用于处理服务间通信。云原生应用有着复杂的服务拓扑，服务网格保证**请求在这些拓扑中可靠地穿梭**。在实际应用当中，服务网格通常是由一系列轻量级的**网络代理**组成的，它们与应用程序部署在一起，但**对应用程序透明**。

:::right
—— by William Morgan
:::

ServiceMesh 之所以称为服务网格，是因为每台节点同时运行着业务逻辑和具备通信治理能力的网络代理（如 Envoy、Linkerd-proxy）。这个代理被形象地称为网络边车代理（Sidecar），其中业务逻辑相当于主驾驶，处理辅助功能的网络代理相当于边车。

:::center
  ![](../assets/sidecar-example.jpg)<br/>
  图 1-22 边车示例
:::

服务网格的关键在于边车（Sidecar）模式，具有通信治理能力的网络代理以边车形式部署，服务之间通过网络代理型边车发现和调用目标服务。如果我们把节点和业务逻辑从视图剥离，网络代理边车之间呈现图 1-23 所示网络状依赖关系，服务网格由此得名。

:::center
  ![](../assets/service-mesh.png)<br/>
  图 1-23 服务网格形象示例
:::

业内绝大部分服务网格产品通常由“数据平面”和“控制平面”两部分组成，以服务网格的代表实现 Istio 架构为例，如图 1-24 所示。

- **数据平面（Data plane）**：通常采用轻量级的网络代理（如 Envoy）作为 Sidecar，网络代理负责协调和控制服务之间的通信和流量处理，解决微服务之间服务熔断、负载均衡、安全通讯等问题。
- **控制平面（Control plane）**：包含多个控制组件，它们负责配置和管理 Sidecar ，并提供服务发现（Discovery）、配置管理（Configuration）、安全控制（Certificates）等功能。


:::center
  ![](../assets/service-mesh-arc.svg)<br/>
  图 1-24 Istio 架构
:::


值得注意的是，尽管服务网格的特点是 Sidecar 模式，但 Sidecar 模式并非服务网格专有。

Sidecar 是一种常见的容器设计模式，Kubernetes 的工作负载 Pod 内可配置多个容器，业务容器之外的其他所有容器均可称为 Sidecar 容器。如日志收集 Sidecar、请求代理 Sidecar 和链路追踪 Sidecar 等等。

如图 1-25 所示，app-container 是一个主业务容器，logging-agent 是一个日志收集的容器。主业务容器完全感知不到 logging-agent 的存在，它只负责输出日志，无需关心后续日志该怎么处理。你思考这样开发一个高内聚、低耦合的系统是否更加容易？

:::center
  ![](../assets/k8s-sidecar.png)<br/>
  图 1-25 Kubernetes Pod 中 Sidecar 容器收集应用日志，并转发至日志后端
:::

至此，相信你已经清楚服务网格不是什么黑科技，也没有什么耀眼的新技术。

服务网格本质是通过 iptables 劫持发送到应用容器的流量，将原本在业务层处理的分布式通信治理相关的技术问题，下沉到网络代理型边车中处理，实现业务与非业务逻辑解耦的目的。

笔者将在第九章完整介绍服务网格技术，阐述服务间通信的演变、服务网格的生态以及服务网格的未来。


[^1]: 参见 https://www.infoq.cn/news/2017/11/WHAT-SERVICE-MESH-WHY-NEED/
