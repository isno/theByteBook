# 8.7 小结

本章第二节，我们完整回顾了服务间通信的演变，相信你完全理解了服务网格出现的背景、它到底解决了什么问题。

服务网格“出圈”的原因，不在于它提供了多少功能，而是把非业务逻辑从应用程序内剥离的设计思想。从最初 TCP/IP 协议的出现，我们看到网络传输相关的逻辑从应用层剥离，下沉至操作系统，成为操作系统的网络层。随着分布式系统的崛起，又带来了特有的分布式通信语义（服务发现、负载均衡、限流、熔断、加密...）。为了降低治理分布式通信的心智负担，一些面向微服务架构的 SDK 框架出现了，但这类框架与业务逻辑耦合在一起，带来门槛高、无法跨语言、升级困难三个本质问题。

服务网格的出现为分布式通信治理带来了全新的思路：通信治理逻辑从应用程序内部剥离至边车代理，下沉至 Kubernetes、下沉至各个云平台，在应用层与基础设施层之间衍生出全新的微服务治理层。沿着上述“分离/下沉”的设计思想，服务网格的形态开始多元化，出现了 Proxyless、Sidecarless、Ambient Mesh 等多种模式。

无论服务网格下沉至哪里、产品以何种形态存在，核心都是将非业务逻辑从应用程序中剥离，让业务开发更简单。这正是业内常提到的“以应用为中心”的软件设计核心理念。

参考文档：
- 《William Morgan 的服务网格之战》，https://softwareengineeringdaily.com/2019/05/31/service-mesh-wars-with-william-morgan/
- 《Pattern: Service Mesh》，https://philcalcado.com/2017/08/03/pattern_service_mesh.html
- 图书《云原生服务网格Istio：原理、实践、架构与源码解析》
- https://blog.container-solutions.com/wtf-is-cilium
- https://isovalent.com/blog/post/cilium-service-mesh/