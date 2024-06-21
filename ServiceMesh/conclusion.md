# 8.6 小结

从最初 TCP/IP 的出现，我们看到 TCP/IP 将网络传输从应用层剥离，并下沉到操作系统网络层。然后分布式系统的崛起，又特来特有的分布式系统通信语义（熔断策略、负载均衡、服务发现...）。

为解决分布式通信语义，一些面向微服务架构的开发框架出现了，但这类框架因为与业务耦合，因此带来三个本质问题（门槛高、无法跨语言、升级困难）。

将服务治理的功能从 SDK 剥离至 Sidecar，这是 Service Mesh 在技术实现上走出的第一步，也是 ServiceMesh 最重要的一步：“实现了业务逻辑和非业务逻辑最彻底的分离”，非业务逻辑沉到基础设施层，让工程师们的精力专注在应用创新以及实现业务层价值。

解决了最核心的问题，ServiceMesh 引来海阔天空的发展，沿着上述“分离/下沉”发展主线，基础设施层继续下沉到 VM、K8S，产品的形态也开始多元化：Proxyless、Ambient Mesh、Sidecarless。

最后，无论是 ServiceMesh 还是云原生中大部分技术栈，虽然各个维度、领域不同，都是以“下沉为基础设施层”、“以应用为中心”思想的进一步体现。


参考文档：
- 《William Morgan 的服务网格之战》，https://softwareengineeringdaily.com/2019/05/31/service-mesh-wars-with-william-morgan/
- 《Pattern: Service Mesh》，https://philcalcado.com/2017/08/03/pattern_service_mesh.html
- 图书《云原生服务网格Istio：原理、实践、架构与源码解析》
- https://blog.container-solutions.com/wtf-is-cilium
- https://isovalent.com/blog/post/cilium-service-mesh/