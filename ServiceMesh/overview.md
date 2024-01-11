# 8.2 服务网格的产品与生态

2016年1月，Buoyant 公司发布了第一代 ServiceMesh 产品 Linkerd。初次发布的 Linkerd 以 Scala 编写，绝大部分关注点都是如何做好 proxy（代理） 并完成一些通用控制面的功能。同期专注于 proxy 领域的还有一个重量级选手 Envoy，Envoy 是 CNCF 内继 Kubernetes、Prometheus 第三个孵化成熟的项目，由 Lyft 公司基于 C++ 开发，特点为性能出色、功能成熟。初代的 ServiceMesh 虽然理念美好，但以 sidecar 为核心存在不少缺陷：特别是 Linkerd，其明显的资源消耗、性能影响广受诟病；其二仅限于数据层面的代理功能时，当大量部署 sidecar 以后，并没有充分考虑如何管理和控制这些 sidecar。

于是，第二代 Service Mesh 应运而生。2017年5月，Google、IBM、Lyft 宣布新一代的服务网格 Istio 开源，有巨头背书以及**新增控制平面的设计理念**让 Istio 得到极大关注和发展，并迅速成为 ServiceMesh 的代表产品。

<div  align="center">
	<img src="../assets/linkerd-control-plane.png" width = "500"  align=center />
	<p>Linkerd 架构</p>
</div>


## xDS

Envoy 倒成了偷偷领先的玩家，成为了云原生时代数据平面的事实标准。新兴API网关如Gloo，Ambassador都基于Envoy进行扩展开发；而在服务网格中，Istio、Kong社区Kuma、亚马逊AWS App Mesh都使用Envoy作为默认数据面。

与HAProxy以及Nginx等传统Proxy依赖静态配置文件来定义各种资源以及数据转发规则不同，Envoy几乎所有配置都可以通过订阅来动态获取，如监控指定路径下的文件、启动gRPC流或轮询REST接口，对应的发现服务以及各种各样的API统称为xDS。

以Istio中Pilot为例，当Pilot发现新的服务或路由规则被创建（通过监控K8S集群中特定CRD资源变化、或者发现Consul服务注册和配置变化），Pilot会通过已经和Envoy之间建立好的gRPC流将相关的配置推送到Envoy。Envoy接收到相关配置并校验无误之后，就会动态的更新运行时配置，使用新的配置更新相关资源。Pilot工作原理如图1所示。



利用xDS协议，Envoy可以实现配置的完全动态化，配置实时更新而无需重启Envoy或者影响业务。


- 控制面：主要用于更新，下发配置。
- 数据面：主要用于使用控制面的配置进行流量代理。


主打世界上最轻、最简单、最安全的Kubernetes服务网格


Istio 被争相追捧的同时，作为 service mesh 概念的缔造者 Buoyant 公司自然不甘心出局，使用Rust构建数据平面 linkerd2-proxy ，使用Go构建控制平面 痛定思痛 使用 Rust 开发了数据面产品 ，使用 Go 开发了 控制平面 Conduit，主打轻量化，Buoyant 的第二代ServiceMesh 产品最初是以 Conduit 命名，在 Conduit 加入 CNCF 后不久，宣布与原有的 Linkerd 项目合并，被重新命名为Linkerd 2[^1]。

<div  align="center">
	<img src="../assets/service-mesh-overview.png" width = "500"  align=center />
	<p>ServiceMesh 生态</p>
</div>

除了头部的 Linkrd，Istio 玩家外，又怎少得了传统的 Proxy 玩家，Kong 推出了 ServiceMesh kuma，有意思的是 Kong 选择了 Envoy 作为数据平面，而非 Kong 网关核心内核 nginx+openresty。远古玩家 Nginx 也祭出自己新一代的产品 Nginx Service Mesh，主打简化 Service Mesh，并顺势推出商业产品 Aspen Mesh。APISIX 推出了 Amesh，与 William Morgan 的死磕 Istio 策略不同，绝大部分在 Proxy 领域根基深厚玩家，从一开始就没有想过要做一套完整的第二代 Service Mesh 开源方案，而是实现支持 xDS协议，宣布兼容 Istio, 作为 Istio 的数据面。


## 性能对比

来一场Linkerd-Proxy 与 Envoy 的较量。

实验版本 2.11.1， Istio 1.12.0。 使用 Kinvolk 模仿现实场景，延迟数据是从客户端的角度测量，而不是内部的代理时间。

<div  align="center">
	<img src="../assets/latency-200rps.png" width = "500"  align=center />
	<p>ServiceMesh 生态</p>
</div>

中位数 Linkerd 8ms vs 26ms median; 90ms vs 250ms max。

Istio 在 P99 百分位发生了巨大的跳跃，几乎达到了 250 ms的延迟。

Istio 的控制平面平均使用 597 Mb，而 linkerd 只有 365mb。高出 

<div  align="center">
	<img src="../assets/linkerd-resource.png" width = "500"  align=center />
	<p>linkerd-resource</p>
</div>

数据平面的内存 和 CPU 消耗也少一个数量级。


Service Mesh 属于锦上添花的一种方案，而不是雪中送炭，所以在惰性的情况下大家没什么动力。

iptables带来的性能损耗，原来本来是A->B，现在变成A->iptables+sidecar->iptables+sidecar->B，如果不用iptables而采用手动接入又会对业务方产生工作量。感觉只能等ebpf的普及可能会绕过iptables实现流量的高效代理。但是目前ebpf需要的内核还比较新，所以也需要一段时间的等待。


[^1]: 参见 https://github.com/linkerd/linkerd2