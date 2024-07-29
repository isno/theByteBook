# 2.9 小结

用户端网络的优化是一个非常重要的课题，如果用户的请求无法顺利到达服务端，那么无论后端设计得多么可靠，延迟控制得多么低，这些优势都无法体现其价值。因此，确保用户端到服务端的通信畅通无阻，是提供可靠服务的前提。

本章，我们详细分析了 HTTPS 的请求过程中的域名解析、HTTP 压缩、SSL 加密、网络拥塞控制等关键环节，思考了它们的设计原理和正确应用姿势。

通过以上内容的学习，相信你已经完全掌握构建“足够快”的网络服务的能力。同时，当网络发生故障时，你也有了更全局的视角、用更专业的手法来诊断和解决问题。

参考文档：
- DNS 服务器类型，https://www.cloudflare.com/zh-cn/learning/dns/dns-server-types/
- 《A Question of Timing》，https://blog.cloudflare.com/a-question-of-timing/
- 《从流量控制算法谈网络优化 – 从 CUBIC 到 BBRv2 算法》，https://aws.amazon.com/cn/blogs/china/talking-about-network-optimization-from-the-flow-control-algorithm/
- 《BBR: Congestion-Based Congestion Control》，https://research.google/pubs/bbr-congestion-based-congestion-control-2/
- 《What Is HTTP/3 – Lowdown on the Fast New UDP-Based Protocol》，https://kinsta.com/blog/http3/