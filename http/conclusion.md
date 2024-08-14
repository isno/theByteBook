# 2.9 小结

网络优化是一个端到端的系统性工作，遵循二八原则。即 80% 的性能损耗在 20% 的处理流程上。所以优化的前提是分析出导致 80% 性能损耗的 20% 的处理流程到底在哪里。

本章，我们详细分析了 HTTPS 的请求过程，讲解了其中域名解析、内容压缩、SSL 层加密、网络拥塞控制等主要的环节的原理和优化操作。相信你对于构建足够快的网络服务，有了足够的认识。

虽然 HTTPS 让传输更加安全，但很多服务赶鸭子上架式使用 HTTPS 往往都会遇到：请求变慢、服务器负载过高、证书过期不及时更新问题。

构建高可用架构的第一步是保证从客户端到服务端的请求是通畅无阻的，也就是域名解析不能失败。如果域名解析失败了，那么后端无论是两地三中心，还是别的什么高可用设计，都无法发挥作用。

经过本章的学习，相信你已经掌握构建足够快的网络服务，低延迟的（尽可能快）、可靠的（避免请求失败）、安全的（使用 TLS1.3 协议 + ECC 证书，即快又安全），还要充分利用带宽（弱网环境下，榨干带宽，提高网络吞吐）。

参考文档：
- DNS 服务器类型，https://www.cloudflare.com/zh-cn/learning/dns/dns-server-types/
- 《A Question of Timing》，https://blog.cloudflare.com/a-question-of-timing/
- 《从流量控制算法谈网络优化 – 从 CUBIC 到 BBRv2 算法》，https://aws.amazon.com/cn/blogs/china/talking-about-network-optimization-from-the-flow-control-algorithm/
- 《BBR: Congestion-Based Congestion Control》，https://research.google/pubs/bbr-congestion-based-congestion-control-2/
- 《What Is HTTP/3 – Lowdown on the Fast New UDP-Based Protocol》，https://kinsta.com/blog/http3/