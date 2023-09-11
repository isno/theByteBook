# 1.6.3 服务网格

在云原生计算基金会（CNCF）的最新定义中，服务网格被与微服务等同看待，这标志着服务网格技术已经成为云原生的又一个重要领域，而非仅仅被视为实施微服务的一种新方法。

服务网格（Service Mesh）的概念最早由 Buoyant CEO William Morgan 在2016年首次提出，2017年4月该公司发布了第一个 Service Mesh 产品 Linkerd。 同年发表了文章《What’s a service mesh？And why do I need one?》，被公认是 Service Mesh 的权威定义。

:::tip  文章内 William Morgan 对 ServiceMesh 的定义

“A service mesh is a dedicated infrastructure layer for handling service-to-service communication. It’s responsible for the reliable delivery of requests through the complex topology of services that comprise a modern, cloud native application. In practice, the service mesh is typically implemented as an array of lightweight network proxies that are deployed alongside application code, without the application needing to be aware.”

Service Mesh 是一个处理服务通讯的专门的基础设施层。它的职责是在由云原生应用组成服务的复杂拓扑结构下进行可靠的请求传送。在实践中，它是一组和应用服务部署在一起的轻量级的网络代理，对应用服务透明。

:::


上一节内容，我们已经阐述过服务网格出现的背景和原因。这一节我们探讨下服务网格的架构演化以及未来的技术方向及加深理解。


## 1.Sidecar

一般来说，典型的服务网格都在使用 Sidecar 作为数据平面，但 Sidecar 模式并不是服务网格所特有的。Kubernetes 的 Pod 提供了多容器支持，所有伴随应用容器部署的其他容器都可以被称为 Sidecar，如日志收集、追踪代理等。

服务网格将具有流控能力的代理以 Sidecar 部署，从而组成了网格数据平面的基本形态。



对于异构微服务系统来说，很难有一个统一的、跨语言、跨系统的SDK来提供服务治理解决方案。Sidecar 借机杀入服务治理战场。

Sidecar 本质上是一个服务代理，通过劫持发送到应用容器的流量从而实现对流量的控制，随着服务网格落地实践，Sidecar 的缺点也逐渐被暴露。

- 延迟问题：尽管从一些产品的 benchmark 结果来看，Sidecar 的引入只会增加毫秒级（个位数）延迟，但对性能有极高要求的业务场景，来说，延迟损耗成为了放弃服务网格的最主要原因。
- 资源占用：Sidecar 作为一个独立的容器必然会占用一定的系统资源，对于超大规模集群（如数万个 Pod）来说，巨大的基数也使得资源总量变成了不小的数目，同时，这类集群的网络通信拓扑也更加复杂，配置下发的规模也会让 Sidecar 的内存出现剧烈的增长。


## 2.Proxyless

<div  align="center">
	<img src="../assets/proxyless.svg" width = "520"  align=center />
</div>



读者可能已经发现，所谓 Proxyless 其实和传统的 SDK 并无二致，只是将流控能力内嵌到负责通信协议的类库中，因此它具有和传统 SDK 服务框架相同的缺点，也正因为如此，业内很多人认为 Proxyless 本质上是一种倒退，是回归到传统的方式去解决服务通信的问题。

## 3.Sidecarless

既然有了去代理模式，那又何妨多个去边车模式，这就是所谓的 Sidecarless。

2022 年 Cilium 基于 ebpf 技术发布了具有服务网格能力的产品。Cilium 的服务网格产品提供了两种模式，对于 L3/L4 层的能力直接由 ebpf 支持，L7 层能力由一个公共的代理负责，以 DaemonSet 方式部署。

<div  align="center">
	<img src="../assets/sidecarless.png" width = "520"  align=center />
</div>

基于 ebpf 的服务网格在设计思路上其实和 Proxyless 如出一辙，即找到一个非 Sidecar 的地方去实现流量控制能力。它们一个是基于通信协议类库，一个是基于内核的扩展性。ebpf 通过内核层面提供的可扩展能力，在流量经过内核时实现了控制、安全和观察的能力，从而构建出一种新形态的服务网格。

但同样，软件领域没有银弹，Sidecarless 也是取舍后的结果。ebpf 并不是万能钥匙，也存在内核版本要求、编写难度大、安全等方面的问题。


## 4.Ambient Mesh 

2022 年 9 月 Istio 发布了一个名为“Ambient Mesh”的无边车数据平面模型，宣称用户可以弃用 Sidecar，以 Ambient Mesh 模式使用 Istio 的特性。

Ambient Mesh 将 Istio 的功能分为两层，安全覆盖层用来处理 L4 层的路由和安全。如果需要，用户可以启用 L7 处理层从而使用更全面的功能特性。在这一点上它和 Cilium 的做法类似。

<div  align="center">
	<img src="../assets/Ambient-Mesh.png" width = "520"  align=center />
</div>

从官方的博客来看，Istio 在过去的半年中一直在推进 Ambient Mesh 的开发，并于 2023 年 2 月将其合并到了 Istio 的主代码分支。这也从一定程度上说明 Istio 未来的发展方向之一就是持续的对 Ambient Mesh 改进并探索多种数据平面的可能性。
 