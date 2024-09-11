# 8.6 小结

本章第二节，我们完整回顾了服务间通信的演变，相信你完全理解了服务网格出现的背景，以及它到底解决了什么问题。

从最初 TCP/IP 的出现，我们看到网络传输相关的逻辑从应用层剥离，并下沉到操作系统网络层。然后分布式系统的崛起，又带来了特有分布式通信语义（熔断策略、负载均衡、服务发现...）。为解决分布式通信语义，一些面向微服务架构的 SDK 框架出现了，但这类框架因为与业务耦合，因此带来三个本质问题（门槛高、无法跨语言、升级困难）。

服务网格的出现，为了分布式通信治理带来了全新的思路，将服务治理的功能从 SDK 剥离至 Sidecar，“实现了业务逻辑和非业务逻辑最彻底的分离，并下沉为基础设施层”，让工程师们的精力专注在应用创新以及实现业务层价值。

解决了最核心的问题，有了良好的设计理念指导后，服务网格引来海阔天空的发展，沿着上述“分离/下沉”的设计理念，服务网格的演进形态开始多元化，出现了 Proxyless、Sidecarless、Ambient Mesh 等多种模式。

最后，云原生中大部分技术栈，无论是 ServiceMesh 还是 Serverless（无服务器计算）等等，虽然它们各个维度、领域不同，但核心都是将非功能逻辑从应用中剥离，让业务开发更简单。这也是业内常提到的“以应用为中心”软件设计理念的核心。


参考文档：
- 《William Morgan 的服务网格之战》，https://softwareengineeringdaily.com/2019/05/31/service-mesh-wars-with-william-morgan/
- 《Pattern: Service Mesh》，https://philcalcado.com/2017/08/03/pattern_service_mesh.html
- 图书《云原生服务网格Istio：原理、实践、架构与源码解析》
- https://blog.container-solutions.com/wtf-is-cilium
- https://isovalent.com/blog/post/cilium-service-mesh/