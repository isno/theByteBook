# 3.6 小结

本章我们通过 Linux 内核网络框架 netfilter 以及 iptables 、conntrack 等内容，了解了操作系统所设计的最基本的规则。此外，DPDK、XDP 篇节也展示了极致网络优化的方向。

在 3.5 节，通过介绍各类虚拟化设备，我们看到伴随着容器技术的诞生，时代对网络密度提出了越来越高的要求，首先是 veth 走上舞台，但是密度够了，还要性能的高效，MACVlan 和 IPVlan 通过子设备提升密度并保证高效的方式应运而生。

不过，单机性能无论优化总有天花板，构建大规模的应用最终还是要走向分布式。下一章，让我们进入分布式系统的首篇 —— 负载均衡技术。

本章参考内容

- 《linux-network-performance-parameters
》，https://github.com/leandromoreira/linux-network-performance-parameters
- 《虚拟网络》，https://qiankunli.github.io/2015/04/24/virtual_network.html