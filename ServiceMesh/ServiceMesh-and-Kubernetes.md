# 8.4 服务网格与 Kubernetes

Kubernetes 的本质是应用的生命周期管理，具体来说就是部署和管理（扩缩容、自动恢复、发布）。Kubernetes 为微服务提供了可扩展、高弹性的部署和管理平台。Service Mesh 的基础是透明代理，通过 sidecar proxy 拦截到微服务间流量后再通过控制平面配置管理微服务的行为。Service Mesh 将流量管理从 Kubernetes 中解耦，Service Mesh 内部的流量无需 kube-proxy 组件的支持，通过为更接近微服务应用层的抽象，管理服务间的流量、安全性和可观察性。

<div  align="center">
	<img src="../assets/ServiceMesh-and-Kubernetes.png" width = "450"  align=center />
	<p>图片来源于《云原生服务网格Istio》</p>
</div>

