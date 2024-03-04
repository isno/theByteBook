# 8.6 小结

服务网格从概念诞生，尽管到现在已经发展接近八年的时间，但从目前的应用状况看，服务网格种种特性（无侵入治理、可观测等等）更多还是作用于云商宣传手段。

一方面服务网格技术本身过于复杂（比传统侵入式框架还要复杂），包括 ambient mesh Cilium ServiceMesh，另一方面服务网格属于锦上添花的一种方案，而不是雪中送炭，所以业务运行良好，传统框架生态成熟的情况下大家没什么动力去折腾。预期很美好，但要大规模的落地，还是需要一段时间。

参考

- William Morgan 的服务网格之战，https://softwareengineeringdaily.com/2019/05/31/service-mesh-wars-with-william-morgan/
- Pattern: Service Mesh，https://philcalcado.com/2017/08/03/pattern_service_mesh.html
- 《云原生服务网格Istio：原理、实践、架构与源码解析》
- https://blog.container-solutions.com/wtf-is-cilium
- https://isovalent.com/blog/post/cilium-service-mesh/