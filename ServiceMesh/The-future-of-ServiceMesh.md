# 8.5 服务网格的未来

使用服务网格的架构，在大规模线上部署的时候逐渐遇到了以下两个主要问题：

- **资源消耗过大**：以 sidecar 方式运行，每一个 Pod 都要注入 sidecar，还得为 sidecar 预留足够的 CPU 和内存资源。整个集群全都是 Sidecar，非业务逻辑消耗了大量的资源。
- **Proxy 模式带来的请求延迟**：针对请求的拦截，目前常规的做法是使用 iptbales，当原来本来是A->B，现在变成A->iptables+sidecar->iptables+sidecar->B。代理增加了业务请求的链路长度，那必然会带来性能损耗（代理之后每次 400-500us）。

针对以上问题，社区出现以 Ambient Mesh（无代理） 和 Cilium Service Mesh（跨内核，绕过 iptables 实现）为代表的两类解决方案。

## Ambient Mesh 

Ambient Mesh 是一个全新的 Istio 数据平面模式，让用户无需使用 Sidecar 代理，就能将网格数据平面集成到其基础设施中，同时还能保持 Istio 的零信任安全、遥测和流量治理等核心特性。 

## Cilium Service Mesh

说明了运行 Cilium Envoy filter（棕色）的单个节点范围的 Envoy 代理与运行 Istio Envoy filter（蓝色）的双边车 Envoy 模型的 HTTP 处理的典型延迟成本。黄色是没有代理且未执行 HTTP 处理的基线延迟。

:::center
![这是图片](../assets/cilium-istio-benchmark.webp)
:::