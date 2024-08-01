# 2.6.3 BBR 的测试报告

笔者的测试结果中，网络环境条件好的情况下两者相差无几，但如果是弱网、有一定丢包率的场景下，BBR 的性能较传统的 Cubic 算法提升 50% 以上。

网络工程师 Andree Toonk 在他的博客使用不同拥塞控制算法、延迟和丢包参数所做网络吞吐量的全套测试。测试报告如表 2-3 所示，可以看到，BBR 在大带宽长链路（典型的如跨海、跨国、跨多个运营商的网络），尤其是轻微丢包网络环境下的出色表现。

:::center
表 2-3 各拥塞控制算法在不同丢包率环境下的性能测试 [表数据来源](https://toonk.io/tcp-bbr-exploring-tcp-congestion-control/index.html)
:::
:::center
  ![](../assets/result2.png)<br/>
:::