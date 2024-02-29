# 8.4 服务网格与 Kubernetes

承载应用 Workload 的形式已经从”物理机“过渡到”容器“。

容器意味着创建（包括初始化）和销毁高度自动化，且具备极强弹性。此时，基础设施的功能（服务发现、负载均衡、熔断限流、路由等）与业务代码的集成需要在低成本前提下保证相同的生命周期。物理机时代，基础设施功能添加到业务代码的方式只能选择 SDK，而容器时代，基础设施的功能添加到业务代码的最佳方式变成了 Sidecar。

Kubernetes 的本质是应用的生命周期管理，具体来说就是部署和管理（扩缩容、自动恢复、发布）。Kubernetes 为微服务提供了可扩展、高弹性的部署和管理平台。Service Mesh 的基础是透明代理，通过 sidecar proxy 拦截到微服务间流量后再通过控制平面配置管理微服务的行为。Service Mesh 将流量管理从 Kubernetes 中解耦，Service Mesh 内部的流量无需 kube-proxy 组件的支持，通过为更接近微服务应用层的抽象，管理服务间的流量、安全性和可观察性。

<div  align="center">
	<img src="../assets/ServiceMesh-and-Kubernetes.png" width = "450"  align=center />
	<p>图片来源于《云原生服务网格Istio》</p>
</div>

