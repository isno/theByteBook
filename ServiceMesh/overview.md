# 8.3 服务网格的产品与生态

Buoyant 公司在 2016 年发布了第一代服务网格 Linkerd，同一时期，离开 Twitter 的工程师 Matt Klein 加入了 Lyft，并开启了 Envoy 项目。第一代服务网格稳步推进的过程中，世界的另一角落，Google 和 IBM 两个巨头开始握手合作，它们联合 Lyft 启动了 Istio 项目。

## 8.3.1 Istio 入局

2017 年 5 月，Google、IBM 和 Lyft 开源新一代的服务网格 Istio，有巨头背书以及**新增控制平面的设计理念**让 Istio 得到极大关注和发展，并迅速成为第二代服务网格的代表项目。

Istio 最大的创新在于它为服务网格带来前所未有的控制力：

- 以 Linkerd 代表的第一代服务网格用 Sidercar 方式控制服务间所有的流量；
- 以 Istio 为代表的第二代服务网格增加控制面板，控制系统中所有的 Sidecar。于是，Istio 便控制了系统中所有请求，也即控制了所有的流量。

对于一个初衷提供服务与服务之间连接通信的基础设施来说，Istio 的架构算不上简单，它的架构如图 8-10 所示，各个组件作用如下：
- **Pilot**：从上（如 Kubernetes）获取服务信息，完成服务发现，往下（Proxy）下发流量管理以及路由规则等 xDS 配置，驱动数据面按照规则实现流量管控（A/B 测试、灰度发布）、弹性（超时、重试、熔断）、调试（故障注入、流量镜像）等功能。
- **Citadel**：充当证书颁发机构（CA），负责身份认证和证书管理，可提供服务间和终端用户的身份认证，实现数据平面内安全的 mTLS 通信。
- **Galley**：负责将其他 Istio 组件和底层平台（Kubernetes）进行解耦，负责配置获取、处理和分发组件。

:::center
  ![](../assets/service-mesh-arc.svg)<br/>
  图 8-10 Istio 架构及各个组件
:::

## 8.3.2 Linkerd 2.0 出击

Istio 被争相追捧的同时，作为服务网格概念的创造者 William Morgan 自然不甘心出局，公司生死存亡之际，瞄准 Istio 的缺陷（过于复杂）并借鉴 Istio 的设计理念（新增控制平面），开始重新设计它们的服务网格，主打轻量化，目标是世界上最轻、最简单、最安全的 Kubernetes 专用服务网格。

Buoyant 第二代服务网格别出心裁的使用 Rust 构建数据平面 linkerd2-proxy ，再使用 Go 开发了控制平面 Conduit。该项目最初以 Conduit 命名，在 Conduit 加入 CNCF 后不久，宣布与原有的 Linkerd 项目合并，被重新命名为 Linkerd 2[^1]，

Linkerd2 的架构如图 8-12 所示，增加了控制平面，但整体简单：
- 控制层面组件只有 destination（类似 Pilot）、identity（类似 Citadel）和 proxy injector（代理注入器）。
- 数据平面中 linkerd-init 设置 iptables 规则拦截 Pod 中的 TCP 连接，Linkerd-proxy 实现对所有的流量管控（负载均衡、熔断..）。

:::center
  ![](../assets/linkerd-control-plane.png)<br/>
  图 8-11 Linkerd2 架构及各个组件
:::

## 8.3.3 其他参与者

除了头部的 Linkerd2、Istio 玩家外，明显能影响微服务格局的新兴领域，又怎少得了传统的 Proxy 玩家。

先是远古玩家 Nginx 祭出自己新一代的产品 Nginx ServiceMesh，理念是简化版的服务网格，F5 Networks 公司顺势推出商业化产品 Aspen Mesh，定位企业级服务网格项目，API 网关独角兽 Kong 推出了 Kuma，主打通用型的服务网格，有意思的是 Kong 选择了 Envoy 作为数据平面，而非它自己的核心内核 OpenResty，接着 APISIX 推出了 Amesh...。

与 William Morgan 死磕 Istio 策略不同，绝大部分在 Proxy 领域根基深厚玩家，从一开始就没有想过做一套完整服务网格方案，而是选择实现 xDS 协议或基于 Istio 扩展，兼容 Istio，作为 Istio 的数据平面出现。

至 2023 年，服务网格经过 8 年的发展，产品生态如图 8-12 所示，虽然有众多的选手，但就社区活跃度而言，Istio 还是牢牢占据了头部地位。

:::center
  ![](../assets/service-mesh-overview.png)<br/>
  图 8-12 CNCF 下 服务网格领域生态
:::

## 8.3.4 Istio 与 Linkerd2 性能对比

2019 年，云原生技术公司 Kinvolk 发布了 Linkerd2 与 Istio 性能对比报告，测试数据显示 Linkerd 比 Istio 明显更快、更轻。这项测试工作还诞生服务网格基准测试工具 service-mesh-benchmark[^2]，以便任何人都可以复查结果。

两年之后，Linkerd 以及 Istio 都发布了多个更成熟的版本，两者的性能表现如何？笔者引用 William Morgan 文章《Benchmarking Linkerd and Istio》[^3]中的数据，向读者介绍 Linkerd v2.11.1、Istio v1.12.0 两个项目之间延迟与资源消耗的表现。

首先是网络延迟的表现，如图 8-13 所示，中位数（P50）延迟的表现 Linkerd 在 6ms 的基准延迟上增加了 6ms 额外延迟，而 Istio 的额外延迟为 15ms。值得注意的是，P90 以后两者开始出现显著差异，最极端的 Max 数据表现上，Linkerd 在 25ms 的基准延迟上增加了 25 ms 额外延迟，而 Istio 则增大了 5 倍，高达 253 ms 的额外延迟。

:::center
  ![](../assets/latency-200rps.png)<br/>
  图 8-13 Linkerd 与 Istio 的延迟对比
:::

继续看 Istio 与 Linkerd 数据平面在资源消耗方面的表现。如图 8-14 所示，Linkerd 代理消耗的内存最大 26 Mb，Istio 的 Envoy 代理消耗的内存最大 156.2 Mb，是 Linkerd 的 6倍。同样，Linkerd 的最大代理 CPU 时间记录为 36ms，而 Istio 的代理 CPU 时间记录为 67ms，比前者多出 85%。

:::center
  ![](../assets/linkerd-resource.png)<br/>
  图 8-14 Istio 与 Linkerd 资源消耗对比 
:::

总结 Linkerd 和 Istio 性能和资源成本上的巨大差异主要归结于 Linkerd2-proxy，该代理为 Linkerd 的整个数据平面提供动力，所以这个基准测试很大程度上反映了 Linkerd2-proxy 和 Envoy 的性能和资源消耗对比。

虽然 Linkerd2-proxy 性能卓越，但语言过于小众，导致开源社区的贡献者数量稀少，截止 2024 年 6 月，Linkerd2-proxy 的贡献者只有 53 人，Envoy 则有 1,104 人。此外，Linkerd2-proxy 不支持服务网格控制协议 xDS，它的未来的发展也只能取决于 Linkerd 发展如何。

[^1]: 参见 https://github.com/linkerd/linkerd2
[^2]: 参见 https://github.com/kinvolk/service-mesh-benchmark
[^3]: 基于 Kinvolk 模仿现实场景，延迟数据从客户端的角度测量，而不是内部的代理时间。详见 https://linkerd.io/2021/05/27/linkerd-vs-istio-benchmarks/