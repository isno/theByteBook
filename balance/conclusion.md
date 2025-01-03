# 4.7 小结

作为分布式系统的入口，负载均衡领域竞争激烈，技术创新层出不穷。但从处理请求的网络层次划分，所有的负载均衡器可分为两类，四层负载均衡和七层负载均衡。

- 四层负载均衡器处理传输层连接，功能相对简单，主要依赖 IP 地址和端口信息进行流量分发。随着技术的不断演进，传统负载均衡设备（如 F5）逐渐被通用服务器加上专用软件（如 IPVS、DPDK、fd.io）的方案取代。例如，一台普通物理主机，基于 DPDK 开发的流量转发或数据包处理场景下，能轻松达突破百万到数千万的 PPS（Packets Per Second，每秒处理的数据包数量）指标。
- 七层负载均衡器处理应用层流量，职责更广、功能丰富。如处理 HTTP 请求、SSL 卸载、URL 路由、Cookie 路由等。这几年，源于微服务架构的快速发展，七层负载均衡领域十分活跃，像传统代理软件（如 NGINX、HAProxy），逐渐被更适应动态微服务架构后来者（如 Envoy、Traefik...）替代。

总体而言，随着技术架构逐步向云厂商主导的 IaaS、CaaS 和 FaaS 模式演进，未来工程师将很少需要关注物理网络的工作原理，隐藏在 XaaS 模式之下的各类网络技术，正逐渐演变为“黑科技”。