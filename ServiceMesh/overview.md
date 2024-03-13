# 8.3 服务网格的产品与生态

初代的服务网格理念美好，但以 Sidecar 为核心还是存在不少缺陷：明显的资源消耗、额外的请求转发带来的性能影响，其次功能仅限于数据层面的代理时，当大量部署 Sidecar 后也没有充分考虑如何管理和控制这些 Sidecar。于是，第一代的服务网格产品（Linkerd、Envoy）刚开始被市场接受，第二代服务网格产品匆忙入局。

## Istio 入局

2017年5月，Google、IBM、Lyft 宣布新一代的服务网格 Istio 开源，有巨头背书以及**新增控制平面的设计理念**让 Istio 得到极大关注和发展，并迅速成为第二代服务网格的代表产品。

Istio 最大的创新在于它为服务网格带来前所未有的控制力。

- 以 Linkerd 代表的第一代服务网格用 Sidercar 方式控制服务间所有的流量
- 以 Istio 为代表的第二代服务网格增加控制面板，控制系统中所有的 Sidecar。

至此，Istio 便控制了系统中所有请求的发送，也即控制了所有的流量。

Istio 的架构如下图所示，对于一个仅提供服务与服务之间连接通信的基础设施来说，Istio 的架构算不上简单，但其中各个组件的理念得承认的确非常先进和超前。

- **Pilot** 从上（如 Kubernetes）获取服务信息，完成服务发现，往下（Proxy）下发流量管理以及路由规则等 xDS 配置，驱动数据面按照规则实现流量管控（A/B测试、灰度发布）、弹性（超时、重试、熔断）、调试（故障注入、流量镜像）等功能。
- **Citadel** 充当证书颁发机构（CA），负责身份认证和证书管理，可提供服务间和终端用户的身份认证，实现数据平面内安全的 mTLS 通信。
- **Galley** 负责将其他 Istio 组件和底层平台（Kubernetes）进行解耦，负责配置获取、处理和分发组件。

<div  align="center">
	<img src="../assets/service-mesh-arc.svg" width = "500"  align=center />
	<p>Istio 架构</p>
</div>

## Linkerd 2.0 出击

Istio 被争相追捧的同时，作为 Service Mesh 概念的创造者 Buoyant 公司自然不甘心出局，公司生死存亡之际，瞄准 Istio 的缺陷（过于复杂）借鉴 Istio 的设计理念（新增控制平面），开始重新设计它们的服务网格产品：使用 Rust 构建数据平面 linkerd2-proxy ，使用 Go 开发了控制平面 Conduit。主打轻量化，目标是世界上最轻、最简单、最安全的 Kubernetes 专用的服务网格。

Buoyant 第二代服务网格产品最初以 Conduit 命名，在 Conduit 加入 CNCF 后不久，宣布与原有的 Linkerd 项目合并，被重新命名为Linkerd 2[^1]。Linkerd2 的架构如下图所示，增加了控制平面，但整体简单。

控制层面只有（destination 类似 Pilot，identity 类似 Citadel）和 proxy injector（代理注入器）。数据面中 linkerd-init 设置 iptables 规则拦截 pod 中的 TCP 连接，Linkerd-proxy 实现所有的流量管控（负载均衡、熔断..）。

<div  align="center">
	<img src="../assets/linkerd-control-plane.png" width = "500"  align=center />
	<p>Linkerd2 架构</p>
</div>

## 其他参与者

除了头部的 Linkrd，Istio 玩家外，明显能影响微服务格局的新兴领域，又怎少得了传统的 Proxy 玩家。远古玩家 Nginx 祭出自己新一代的产品 Nginx Service Mesh，主打简化 Service Mesh，并顺势推出商业产品 Aspen Mesh。Kong 推出了 ServiceMesh kuma，有意思的是 Kong 选择了 Envoy 作为数据平面，而非 Kong 网关核心内核 OpenResty。APISIX 也推出了 Amesh。

与 William Morgan 的死磕 Istio 策略不同，绝大部分在 Proxy 领域根基深厚玩家，从一开始就没有想过要做一套完整的第二代服务网格方案，而是选择实现 xDS 协议，宣布兼容 Istio，作为 Istio 的数据面。

现如今的服务网格产品生态如下，虽然有众多的选手，但就社区活跃度而言，Istio 还是牢牢占据了头部地位。

<div  align="center">
	<img src="../assets/service-mesh-overview.png" width = "500"  align=center />
	<p>CNCF 下 ServiceMesh 领域生态</p>
</div>


## Istio 与 Linkerd2 性能对比

2019年，Kinvolk（2021年被微软收购）曾发布 Linkerd 与 Istio 的公开基准数据，数据表明 Linkerd 比 Istio 明显更快、更轻。这项测试工作还诞生了一个 开源的服务网格基准测试工具 service-mesh-benchmark[^2]，以便任何人都可以复制结果[^3]。

两年之后，Linkerd 以及 Istio 都发布了多个更成熟的版本，两者的表现如何？这里，我们引用 Linkerd 基于 Kinvolk 模仿现实场景（延迟数据从客户端的角度测量，而不是内部的代理时间）。使用 Linkerd v2.11.1、Istio v1.12.0 从延迟、资源消耗的表现上来看这两款服务网格产品的差异。

首先是延迟数据的表现，中位数（P50）延迟的表现 Linkerd 在 6ms 的基准延迟上增加了额外的 6ms 延迟，而 Istio的额外延迟为 15ms。值得注意的是在 P90 以上两者开始出现显著差异，最极端的 Max 数据表现上 Linkerd 在 25ms 的基准延迟上增加了额外的 25 ms 延迟，而 Istio 则额外增大了 5倍，高达 253 ms 的延迟。

<div  align="center">
	<img src="../assets/latency-200rps.png" width = "500"  align=center />
	<p>Linkerd 与 Istio 的延迟对比</p>
</div>

比控制平面更重要的是数据平面，我们继续看 Istio 与 Linkerd 在数据平面的性能对比。Linkerd 代理消耗的内存最大 26 Mb，Istio 的 Envoy 代理消耗的内存最大在156.2 Mb，是 Linkerd 的 6倍。同样，Linkerd 的最大代理 CPU 时间记录为36ms，而 Istio 的代理 CPU 时间记录为 67ms，比前者多出 85%。

<div  align="center">
	<img src="../assets/linkerd-resource.png" width = "500"  align=center />
	<p>Istio 与 Linkerd 资源消耗对比</p>
</div>

总结 Linkerd 和 Istio 在性能和资源成本上的巨大差异主要归结于 Linkerd2-proxy，这个微代理为 Linkerd 的整个数据平面提供动力，所以这个基准在很大程度上反映了 Linkerd2-proxy 和 Envoy 的性能和资源消耗对比。

Linkerd2-proxy 虽然性能卓越，但语言过于小众，开源社区的 contributor 数量稀少（只有 53 人，Envoy 有 1,104 人），未选择实现 xDS 那么它的未来的发展也取决于 Linkerd 发展如何

[^1]: 参见 https://github.com/linkerd/linkerd2
[^2]: 参见 https://github.com/kinvolk/service-mesh-benchmark
[^3]: 参见 https://github.com/linkerd/linkerd2/wiki/Linkerd-Benchmark-Setup
[^4]: 参见 https://linkerd.io/2021/05/27/linkerd-vs-istio-benchmarks/