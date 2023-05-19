# Istio

Istio 是一个Service Mesh形态的，用于服务治理的开放平台。这里的服务 “治理”不仅限于“微服务”，可以推广到任何服务。只要存在服务或者应用，在它们之间存在访问，也存在对服务与应用的管理，都可以使用到 Istio 。

## Istio 为什么可以实现流量治理

Istio 中对流量的转发处理都是通过 Envoy 实现的。

Envoy 作为 Sidecar 和每个服务容器部署在同一个 pod 中，Sidecar 在注入到 pod 之后，将原有服务调用从源容器 -> 目标容器的通信方式改变为源容器 -> Sidecar (源端) -> Sidecar (目的端) -> 目的容器

<div  align="center">
	<img src="../assets/sidecar.png" width = "350"  align=center />
</div>


## Istio的架构原理

Istio 服务网格从逻辑上分为数据平面和控制平面。

- 数据平面由一组智能代理（Envoy Proxy）组成，被部署为 sidecar。
- 控制平面管理并配置代理来进行流量路由。

Istio 架构体系中，流控(Traffic Management)虽然是数据平面的 Envoy Proxy 实施的，但整个架构的核心其实在于控制平面 Pilot。Pilot 主要功能就是管理和配置部署在特定 Istio 服务网格中的所有 sidecar 代理实例。它管理 sidecar 代理之间的路由流量规则，并配置故障恢复功能，如超时、重试和熔断。

<div  align="center">
	<img src="../assets/istio-mesh-arch.png" width = "450"  align=center />
</div>


这样 Envoy 接管了流入流出用户服务的流量，持有流量策略。并且 Istio 会自动探测 kubernetes 集群的 services 和 endpoints，从而可以获取 services 与 endpoints 之间的关系，Envoy 配置里既有流量策略，又有 endpoints 自然可以实现流量的转发处理。




当在Kubernetes中使用Istio的时候，其作用主要有如下几点：

监控服务注册中心（如 Kubernetes）的服务注册情况。在 Kubernetes 环境下，会监控 service、endpoint、pod、node 等资源信息。
监控 Istio 控制面信息变化，在 Kubernetes 环境下，会监控包括 RouteRule、 VirtualService、Gateway、EgressRule、ServiceEntry 等以 Kubernetes CRD（K8s自定义资源） 形式存在的 Istio 控制面配置信息。
将上述两类信息合并组合为 sidecar 可以理解的（遵循 Envoy data plane api 的）配置信息，并将这些信息以 gRPC 协议提供给 sidecar。
由以上几点看出，pilot起到了连接Kubernetes和数据平面的作用，它将由kubernetes产生的配置信息转化成数据平面可以识别的格式然后下发给数据平面。



## Istio 工作流程

数据平面是业务之间的通信平面。如果没有一个服务网格，网络就无法理解正在发送的流量，也无法根据它是哪种类型的流量，或者它从谁那里来，到谁那里去做出任何决定。

服务网格使用代理拦截所有的网络流量，允许根据您设置的配置提供广泛的应用程序感知功能。

代理与您在集群中启动的每个服务一起部署，或者与运行在虚拟机上的服务一起运行。

控制平面获取您所需的配置和服务视图，并动态地对代理服务器进行编程，随着规则或环境的变化更新它们。





