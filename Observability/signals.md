# 9.3 遥测数据分类

“可观测性”能力的应用离不开数据与信息，而日志（logs）、指标（metrics）与链路（trace）是最重要的数据信息源。


- **Metrics（度量）**：系统事件发生数量的统计聚合，聚合结果是呈具有时间属性的数字化指标，譬如服务 QPS、API 响应延迟、某个接口的失败数等。聚合后的指标是发现问题的起点，典型例子是收到一条预警“请求成功率跌到了 10%“，你意识到情况不妙并立即开始处理，结合其他 Signals 找到 root cause，从而解决问题。
- **Logging（日志）**：日志描述一系列离散的事件，特别是非预期的行为。在缺乏有力的 APM 系统时，分析日志数据是工程师定位问题时最直接的手段。如果说 Metrics 告诉你应用程序出现了问题，Logging 就告诉你为什么出现问题。

- **Tracing（追踪）**：分布式系统中多个服务之间或多或少都存在依赖关系，Tracing 通过有向无环图的方式记录服务链路之间的因果关系，从而轻松在错综复杂的分布式系统中分析出请求中异常点。

这三个数据信息源虽各有侧重，但也并非完全孤立，它们之间存在着天然的交集与互补。这三者之间的关系，如下图 9-3 的韦恩图所示。

:::center
  ![](../assets/observability.jpg)<br/>
 图 9-3 Metrics，Tracing，Logging 三者之间的关系 [图片来源](https://peter.bourgon.org/blog/2017/02/21/metrics-tracing-and-logging.html)
:::


现在，CNCF 发布的可观测性白皮书中[^1]，将这些可观测的数据统一称为 Signals（信号），主要的 Signals 除了 Metrics、Logs、Traces 之外又增加了 Profiles 和 Dumps。

[^1]: 参见 https://github.com/cncf/tag-observability/blob/main/whitepaper.md