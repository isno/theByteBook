# 2.6.3 BBR 性能表现

通过控制不同的延迟和丢包参数，对不同的拥塞控制算法进行网络吞吐量测试。测试结果如表 2-3 所示，可以看出，BBR 在大带宽长链路（如跨海、跨国、跨多个运营商的网络）和轻微丢包的网络环境下表现尤为出色。

:::center
表 2-3 各拥塞控制算法在不同丢包率环境下的性能测试 [表数据来源](https://toonk.io/tcp-bbr-exploring-tcp-congestion-control/index.html)
:::

|网络吞吐|拥塞控制算法（服务端）|延迟|丢包率|
|:--|:--|:--|:--|
|2.35Gb/s| Cubic| <1ms| 0% |
|195 Mb/s| Reno| <140ms| 0% |
|147 Mb/s| Cubic| <140ms| 0% |
|344 Mb/s| Westwood| <140ms| 0% |
|340 Mb/s| BBR| <140ms| 0% |
|1.13 Mb/s| Reno| <140ms| 1.5% |
|1.23 Mb/s| Cubic| <140ms| 1.5% |
|2.46 Mb/s| Westwood| <140ms| 1.5% |
|**160 Mb/s**| BBR| <140ms| 1.5% |
|0.65 Mb/s| Reno| <140ms| 3% |
|0.78 Mb/s| Cubic| <140ms| 3% |
|0.97 Mb/s| Westwood| <140ms| 3% |
|**132 Mb/s**| BBR| <140ms| 3% |
