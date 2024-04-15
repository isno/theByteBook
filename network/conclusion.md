# 3.6 小结

本章我们介绍了 Linux 内核网络框架 netfilter 以及 iptables 、conntrack 等机制，这些是后续容器网络、负载均衡等应用的基石。此外，DPDK、XDP 篇节也展示了极致网络优化的方向。

不过，单机性能无论优化总有天花板，构建大规模的应用最终还是要走向分布式。下一章，让我们进入分布式系统的首篇 —— 负载均衡技术。

本章参考内容

- 张彦飞《深入理解Linux网络》
- https://github.com/leandromoreira/linux-network-performance-parameters