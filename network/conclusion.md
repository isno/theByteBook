# 3.6 小结

本章我们通过 Linux 内核网络框架 netfilter 以及 iptables 、conntrack 等内容，了解了操作系统所设计的最基本的规则。随着虚拟化技术的发展，我们也看到了通过 Veth 实现基本的通信逻辑以及通过 MACVlan 和 IPVlan 子设备提升网密度并保证高效的方式应运而生。

此外，本章也介绍了 XDP 以及 DPDK 这种跨内核处理网络数据包的方式，相信未来分布式机器训练、大数据处理等网络密集型场景，类似跨内核或者 RDMA 这类突破传统网络的优化模式也会越来越流行。

参考文档：
- 《linux-network-performance-parameters
》，https://github.com/leandromoreira/linux-network-performance-parameters
- 《虚拟网络》，https://qiankunli.github.io/2015/04/24/virtual_network.html
