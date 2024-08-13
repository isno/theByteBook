# 2.9 小结

当我们谈及性能，最直观能想到的一个词是“快”，Strangeloop 在对众多的网站做性能分析之后得出了一个著名的3s定律：“页面加载速度超过3s，57%的访客会离开”，可见网络请求速度对于互联网产品的重要性。

本章，我们详细分析了 HTTPS 的请求过程，讲解了其中域名解析、内容压缩、SSL 层加密、网络拥塞控制等主要的环节的原理和优化操作。相信你对于构建足够快的网络服务，有了足够的认识。

所以说，第一步是保证客户端与服务端的通信“足够快”。也就保证网络请求是低延迟的（尽可能快）、可靠的（避免请求失败）、安全的（使用 TLS1.3 协议 + ECC 证书，即快又安全），还要充分利用带宽（弱网环境下，榨干带宽，提高网络吞吐）。

参考文档：
- DNS 服务器类型，https://www.cloudflare.com/zh-cn/learning/dns/dns-server-types/
- 《A Question of Timing》，https://blog.cloudflare.com/a-question-of-timing/
- 《从流量控制算法谈网络优化 – 从 CUBIC 到 BBRv2 算法》，https://aws.amazon.com/cn/blogs/china/talking-about-network-optimization-from-the-flow-control-algorithm/
- 《BBR: Congestion-Based Congestion Control》，https://research.google/pubs/bbr-congestion-based-congestion-control-2/
- 《What Is HTTP/3 – Lowdown on the Fast New UDP-Based Protocol》，https://kinsta.com/blog/http3/