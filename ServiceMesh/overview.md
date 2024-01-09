# 8.2 服务网格的产品与生态

2016年1月，Buoyant 发布了第一代的 Linkerd。初次发布的 Linkerd 以 Scala 编写，绝大部分关注点都是如何做好 proxy 并完成一些通用控制面的功能，同期专注于 proxy 领域的还有 Lyft 基于 C++ 开发的 Envoy，Envoy 是 CNCF 继 Kubernetes、Prometheus 第三个孵化成熟的项目，无论是理论上还是实际，后者性能和发展都比 Linkderd 更好。初代的 ServiceMesh 方案实现都是以 sidecar 为核心，虽然理想美好，但实际应用中问题不少（特别是 Linkerd，其明显的资源消耗、性能影响广受诟病）。还有一个很重要的问题：这一代的产品仅限于数据层面的代理功能，当在容器中大量部署 sidecar 以后，如何管理和控制这些 sidecar 本身就是一个不小的挑战。

得有个什么东西管理控制 Sidecar，于是，第二代 Service Mesh 应运而生。2017年5月，Google、IBM、Lyft 宣布新一代的服务网格 Istio 开源，有巨头背书以及**新增控制平面的设计理念**让 Istio 得到极大关注和发展，并迅速成为 ServiceMesh 的主流产品。

- 控制面：主要用于更新，下发配置。
- 数据面：主要用于使用控制面的配置进行流量代理。


<div  align="center">
	<img src="../assets/service-mesh-overview.png" width = "500"  align=center />
	<p>ServiceMesh 生态</p>
</div>

除了头部的 Linkrd，Istio 玩家外，又怎少得了传统的 Proxy 玩家，Kong 推出了 ServiceMesh kuma，有意思的是 Kong 选择了 Envoy 作为数据平面，而非 Kong 网关核心内核 nginx+openresty。远古玩家 Nginx 也祭出自己新一代的产品 Nginx Service Mesh，主打简化 Service Mesh，并顺势推出商业产品 Aspen Mesh。APISIX 推出了 Amesh，与 William Morgan 的死磕 Istio 策略不同，绝大部分在 Proxy 领域根基深厚玩家，从一开始就没有想过要做一套完整的第二代 Service Mesh 开源方案，而是实现支持 xDS协议，宣布兼容 Istio, 作为 Istio 的数据面。


Service Mesh属于锦上添花的一种方案，而不是雪中送炭，所以在惰性的情况下大家没什么动力。

iptables带来的性能损耗，原来本来是A->B，现在变成A->iptables+sidecar->iptables+sidecar->B，如果不用iptables而采用手动接入又会对业务方产生工作量。感觉只能等ebpf的普及可能会绕过iptables实现流量的高效代理。但是目前ebpf需要的内核还比较新，所以也需要一段时间的等待。