# ServiceMesh 技术实现


## Istio

Istio 是由 Google、IBM 和 Lyft 发起的开源 Service Mesh 框架。Istio 是 Service Mesh 目前的实现的典型代表，Istio使用Envoy作为Sidecar。

Istio为微服务应用提供了一个完整的解决方案，可以以统一的方式去检测和管理微服务。同时，它还提供了管理流量、实施访问策略、收集数据等功能，而所有这些功能都对业务代码透明，即不需要修改业务代码就能实现。有了Istio，就几乎可以不需要其他的微服务框架，也不需要自己去实现服务治理等功能，只要把网络层委托给Istio，它就能帮助完成这一系列的功能。

由于 Istio 构建与 Kubernetes 之上，因此它自然可以运行于提供  Kubernetes容器服务的云平台环境中， 也因此成为大部分云平台 ServiceMesh 实现方案。

## Linkerd2

Linkerd是Buoyant公司2016年率先开源的高性能网络代理，是业界的第一款Service Mesh框架。

其主要用于解决分布式环境中服务之间通信面临的一些问题，如网络不可靠、不安全、延迟丢包等问题。Linkerd最初使用Scala语言编写，其版本Linkerd2使用Go与Rust重构。

## Conduit

Conduit于2017年12月发布，作为由Buoyant继Linkerd后赞助的另外一个开源项目，作为Linkerd面向Kubernetes的独立版本。Conduit旨在彻底简化用户在Kubernetes使用服务网格的复杂度，提高用户体验，而不是像Linkerd一样针对各种平台进行优化。Conduit的主要目标是轻量级、高性能、安全并且非常容易理解和使用。同Linkerd和Istio，Conduit也包含数据平面和控制平面，其中数据平面由Rust语言开发，使得Conduit使用极少的内存资源，而控制平面由Go语言开发。



<div  align="center">
	<img src="../assets/istio.png" width = "450"  align=center />
</div>


## 小结

Kubernetes的出现已经解决了运维中容器部署，高可用，多副本，容器迁移，弹性扩容，滚动更新，镜像版本管理，服务探活，计算资源分配，计算节点监控等的大部分问题，拥有着优秀的自动运维机制。

但K8S在应用层Service容器上的监控与流量的管理，容器之间的相互调用，监控，注册，配置，浏览治理等功能并未提供。

为了补充此功能模块则出现了Server-Mesh体系的技术，来扩展K8S在这方面的能力。使得微服务不再关注具体配置，环境细节，侧重关心业务功能实现，并且摆脱语言环境的限制。
