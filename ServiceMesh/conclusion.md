# 8.9 小结

本章第二节，我们完整回顾了服务间通信的演变，相信你完全理解了服务网格出现的背景，以及它到底解决了什么问题。

从最初 TCP/IP 协议的出现，我们看到网络传输相关的逻辑从应用层剥离，并下沉到操作系统网络层。然后，随着分布式系统的崛起，又带来了特有的分布式通信语义（熔断策略、负载均衡、服务发现...）。为了降低分布式通信治理的心智负担，一些面向微服务架构的 SDK 框架出现了，但这类框架与业务程序耦合在一起，因此带来门槛高、无法跨语言、升级困难三个本质问题。

服务网格的出现为分布式通信治理带来了全新的思路。服务间通信治理的逻辑从 SDK 剥离至边车代理，技术逻辑和业务逻辑终于实现了彻底性的分离。解决了最核心的问题，服务网格引来海阔天空的发展，沿着上述“分离/下沉”的设计理念，服务网格的演进形态开始多元化，出现了 Proxyless、Sidecarless、Ambient Mesh 等多种模式。

虽然上述各个服务网格的形态不同，但核心都是将非业务逻辑从应用程序中剥离，让业务开发更简单。这也是业内常提到的“以应用为中心”软件设计核心理念。

参考文档：
- 《William Morgan 的服务网格之战》，https://softwareengineeringdaily.com/2019/05/31/service-mesh-wars-with-william-morgan/
- 《Pattern: Service Mesh》，https://philcalcado.com/2017/08/03/pattern_service_mesh.html
- 图书《云原生服务网格Istio：原理、实践、架构与源码解析》
- https://blog.container-solutions.com/wtf-is-cilium
- https://isovalent.com/blog/post/cilium-service-mesh/