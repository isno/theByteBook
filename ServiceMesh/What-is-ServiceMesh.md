# 8.1 什么是 ServiceMesh

2016年，离开 Twiiter 的工程师 William Morgan 和 Oliver Gould 组建了一个小型的技术公司 Buoyant，不久之后 Buoyant 在 github 上发布了它们的创业项目 Linkerd，业界第一款 ServiceMesh 项目诞生。

那么，什么是 ServiceMesh？ServiceMesh 最早出自于 William Morgan 的博文《What’s a service mesh？And why do I need one?》，作为 ServiceMesh 的创造者和布道师，引用 William Morgan 的定义自然是最官方和最权威的。

:::tip William Morgan 对 ServiceMesh 的定义

“A service mesh is a dedicated infrastructure layer for handling service-to-service communication. It’s responsible for the reliable delivery of requests through the complex topology of services that comprise a modern, cloud native application. In practice, the service mesh is typically implemented as an array of lightweight network proxies that are deployed alongside application code, without the application needing to be aware.”

Service Mesh 是一个处理服务通讯的专门的基础设施层。它的职责是在由云原生应用组成服务的复杂拓扑结构下进行可靠的请求传送。在实践中，它是一组和应用服务部署在一起的轻量级的网络代理，对应用服务透明。

:::

概览以下里程碑事件，我们看到 ServiceMesh 从无到有、被社区接受、巨头入局、众人皆捧的历程。

- 2016年9 月，在 SF MicroServices 大会上，“ServiceMesh” 这个术语第一次在公开场合使用，这标志着 ServiceMesh 逐渐从 Buoyant 公司走向社区，并开始被广泛接受以及推崇。
- 2017年1月，Linkerd 加入 CNCF，项目类型被归类到 CNCF 新开辟的 “ServiceMesh” 分类。这代表着 ServiceMesh 理念被 CNCF 社区认同。
- 2017年4月，Linkerd 发布 1.0 版本。Linkerd 实现了最重要的里程碑：被客户接受并在生产线上被大规模应用，ServiceMesh 从理念走向生产实践。
- 2017年5月，Google、IBM、Lyft 联合发布 Istio 0.1 版本，以 Istio 为代表的第二代 ServiceMesh 产品开始登场。
- 2018年7月，CNCF 社区发布的云原生定义中，将服务网格和微服务、容器、不可变基础设施等技术并列。这标志着服务网格已经超越了其原初的角色 —— 仅作为一种实现微服务的新方法，现在已经发展为云原生的又一个关键领域，被放在前所未有的高度。