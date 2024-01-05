# 服务网格的产品与生态

互联网大厂凭借其技术方面的深厚功力与持续投入，在最近几年已经完成了服务网格从初期探索到大规模生产应用的跨越；中小型互联网公司也紧跟大厂步伐，顺应云原生技术浪潮，完成了服务网格“初体验”

2016年1月，Buoyant 初次发布 Linkerd，第一代的 Linkerd 以Scala编写，作为业界第一个开源的service mesh方案，linkerd 绝大部分关注点都是如何做好 proxy 并完成一些通用控制面的功能，专注于 proxy 的还有 Lyft 开发的 envoy，envoy 基于C++ 11编写，是CNCF 继 Kubernetes、Prometheus 第三个孵化成熟的项目，无论是理论上还是实际上，后者性能都比 Linkderd 更好。这两个开源实现都是以 sidecar 为核心，但实际应用中问题不少（特别是 Linkerd，其明显的资源消耗、性能影响广受诟病）。此外，这一代的产品仅限于数据层面的代理功能，当在容器中大量部署 sidecar 以后，如何管理和控制这些 sidecar 本身就是一个不小的挑战。

得有个什么东西管理控制 Sidecar，于是，第二代 Service Mesh 应运而生。2017年5月，Google、IBM、Lyft 宣布新一代的服务网格 Istio 开源，有巨头背书以及新增控制平面的设计理念让 Istio 得到极大关注和发展，并迅速成为 ServiceMesh 的主流产品。

ServiceMesh 最基础的功能毕竟是 sidecar proxy，提到 proxy，怎么能少得了以 Nginx 代表的远古代理亦或资深微服务API玩家。毫不意外，nginx 推出了其 service mesh 的开源实现：nginMesh。APISIX 也在 2010年 5月推出了 apisix-mesh-agent 产品。与 William Morgan 的死磕策略不同，这些在 Proxy 领域根基深厚玩家，从一开始就没有想过要做一套完整的第二代 Service Mesh 开源方案，而是直接宣布兼容 Istio, 作为 Istio 的数据面。

Kong 推出了 ServiceMesh kuma，有意思的是 Kong 选择了 Envoy 作为数据平面，而非 Kong 网关核心内核  nginx+openresty。远古玩家 Nginx 也祭出自己新一代的产品 Nginx Service Mesh，主打简化 Service Mesh，并顺势推出商业产品 Aspen Mesh。

<div  align="center">
	<img src="../assets/service-mesh-overview.png" width = "500"  align=center />
	<p>ServiceMesh 生态</p>
</div>