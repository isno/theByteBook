# 8.1 什么是服务网格

2016年，离开 Twiiter 的工程师 William Morgan 和 Oliver Gould 组建了一个小型的技术公司 Buoyant，不久之后他们在 Github 上发布了创业项目 Linkerd，业界第一款服务网格（ServiceMesh）项目诞生。


那么，什么是服务网格？服务网格的概念最早出自于 William Morgan 的博文《What’s a service mesh？And why do I need one?》，William Morgan作为服务网格的创造者和布道师，引用他的定义自然是最官方和最权威的。

:::tip William Morgan 对服务网格的定义

“A service mesh is a dedicated infrastructure layer for handling service-to-service communication. It’s responsible for the reliable delivery of requests through the complex topology of services that comprise a modern, cloud native application. In practice, the service mesh is typically implemented as an array of lightweight network proxies that are deployed alongside application code, without the application needing to be aware.”

服务网格是一个处理服务通讯的专门的基础设施层。它的职责是在由云原生应用组成服务的复杂拓扑结构下进行可靠的请求传送。在实践中，它是一组和应用服务部署在一起的轻量级的网络代理，对应用服务透明。

:::

从 Micro-Services 到 Service Mesh 承前启后和顺其自然，光看名字就能很形象地理解它所做的事情：把微服务的各个 Service（服务）节点，用一张 mesh（网格）连接起来。就这样，原本被拆散得七零八落的微服务们，又被 Service Mesh 这张大网紧密得连接到了一起，即使依然天各一方（进程间隔离），但也找回了当年一起挤在单体应用内抱团撒欢的亲密感（通信更容易）。


服务之间通过 Sidecar 发现和调用目标服务，从而在服务之间形成一种网络状依赖关系，如果我们把节点和业务逻辑从视图剥离，就会出现一种网络状的架构，如图 1-23 所示，服务网格由此得名。

<div  align="center">
	<img src="../assets/service-mesh.png" width = "580"  align=center />
	<p>图1-23 服务网格形象示例</p>
</div>

感受服务网格从无到有、被社区接受、巨头入局、众人皆捧的历程。

- 2016年9 月，在 SF MicroServices 大会上，“ServiceMesh” 这个术语第一次在公开场合使用，这标志着 ServiceMesh 逐渐从 Buoyant 公司走向社区，并开始被广泛接受以及推崇。
- 2017年1月，Linkerd 加入 CNCF，项目类型被归类到 CNCF 新开辟的 “ServiceMesh” 分类。这代表着 ServiceMesh 理念被 CNCF 社区认同。
- 2017年4月，Linkerd 发布 1.0 版本。Linkerd 实现了最重要的里程碑：被客户接受并在生产线上被大规模应用，ServiceMesh 从理念走向生产实践。
- 2017年5月，Google、IBM、Lyft 联合发布 Istio 0.1 版本，以 Istio 为代表的第二代 ServiceMesh 产品开始登场。
- 2018年7月，CNCF 社区发布的云原生定义中，将服务网格和微服务、容器、不可变基础设施等技术并列。这标志着服务网格已经超越了其原初的角色 —— 仅作为一种实现微服务的新方法，现在已经发展为云原生的又一个关键领域，被放在前所未有的高度。



