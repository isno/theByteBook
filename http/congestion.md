# 2.6 网络拥塞控制原理与 BBR 实践

BBR (Bottleneck Bandwidth and Round-trip propagation time，瓶颈带宽和往返传播时间算法)是 Google 在 2016 年发布的一套拥塞控制算法。BBR 是迄今为止跨越不同路由发送数据的最快的算法，它尤其适合在存在一定丢包率的长链路环境下使用。

本节，我们先深入了解网络拥塞控制的原理，然后再学习如何使用 BBR。