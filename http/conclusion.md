# 2.9 小结

计算机领域有一个很经典的两将军问题，两将军问题证实了：「对于不可靠信道，无数次确认都不能百分百达成可靠共识」。

解决两军问题的工程思路就是接受不确定性这个事实，但努力把不确定性控制到一个可以接受的程度。这种思路在计算机里领域被频繁使用，因此也有了专有的名称 —— 「最大努力交付（Best-Effort Delivery）」。最大努力交付计算机工程最典型的体现就是 TCP 协议，TCP 需要三次握手来建立连接，也是为了降低不确定性。

认识到去中心化网络的这种不确定性，也就理解了所有网络行为。

本章参考内容:

- DNS 服务器类型，https://www.cloudflare.com/zh-cn/learning/dns/dns-server-types/
- 《A Question of Timing》，https://blog.cloudflare.com/a-question-of-timing/
- 《从流量控制算法谈网络优化 – 从 CUBIC 到 BBRv2 算法》https://aws.amazon.com/cn/blogs/china/talking-about-network-optimization-from-the-flow-control-algorithm/
- 《来自 Google 的 TCP BBR拥塞控制算法解析》
- 《BBR: Congestion-Based Congestion Control》，https://research.google/pubs/bbr-congestion-based-congestion-control-2/
- 《What Is HTTP/3 – Lowdown on the Fast New UDP-Based Protocol》，https://kinsta.com/blog/http3/