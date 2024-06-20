# 8.6 小结

为解决微服务的难题，服务治理 SDK 被剥离至 Sidecar，这是 Service Mesh 在技术实现上走出的第一步。而这也是 ServiceMesh 最重要的一步，实现了业务逻辑和非业务逻辑最彻底的分离，让软件开发回顾本质，让工程师们的精力专注在应用创新以及实现业务层价值。

解决了最核心的问题，ServiceMesh 引来海阔天空的发展，沿着上述“分离的”发展主线，基础设施层继续下沉到 VM、K8S，产品的形态也开始多元化：Ambient Mesh、Sidecarless。

最后，我们看到从 ServiceMesh 到云原生绝大部分的技术栈，虽然各个维度、领域不同，但都是“下沉为基础设施层”、“以应用为中心”这种思想的进一步体现。


参考文档：
- 《William Morgan 的服务网格之战》，https://softwareengineeringdaily.com/2019/05/31/service-mesh-wars-with-william-morgan/
- 《Pattern: Service Mesh》，https://philcalcado.com/2017/08/03/pattern_service_mesh.html
- 图书《云原生服务网格Istio：原理、实践、架构与源码解析》
- https://blog.container-solutions.com/wtf-is-cilium
- https://isovalent.com/blog/post/cilium-service-mesh/