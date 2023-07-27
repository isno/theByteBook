# 2.2 连接跟踪

连接跟踪（connection tracking，conntrack，CT）是许多网络应用的基础，例如，Kubernetes Service、ServiceMesh sidecar、软件四层负载均衡器 LVS/IPVS 等等，都依赖连接跟踪功能。


## NAT

NAT（Network Address Translation，网络地址转换）

NAT 又可以细分为几类：

- SNAT：对源地址（source）进行转换
- DNAT：对目的地址（destination）进行转换
- Full NAT：同时对源地址和目的地址进行转换