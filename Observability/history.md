# 9.1 什么是可观测性

分布式系统的可观测性跟控制论里面的可观测性是一致的，这种在其他领域借用的舶来概念并不稀奇，比如常见的“架构”、“设计模式” 等词汇与都是来自于建筑学的概念。

那么，什么是可观测性？可观测性观测什么？Google Cloud 在 OpenTelemetry 的介绍中提到了这么一个概念[^1]：

:::tip telemetry data（遥测数据）

The information that you will use to determine whether an application is healthy and performing as designed is called telemetry data. 

采样和汇总已知与应用程序性能问题相关的应用程序和系统数据，即遥测数据。
:::

事实上，我们进行可观测性，主要就是通过各类的遥测数据对分布式系统提供深⼊可⻅性，以此找到⼤量问题的根本原因并提⾼系统性能。学术界一般会将可观测性的遥测数据分解为三个更具体方向进行研究，它们分别是**事件日志、链路追踪和聚合度量**，这三个方向各有侧重，又不是完全独立，天然就有重合或者可以结合之处。2017 年的分布式追踪峰会结束后，Peter Bourgon 撰写了总结文章《Metrics, Tracing, and Logging》[^2]系统地阐述了这三者的定义、特征以及它们之间的关系与差异，受到了业界的广泛认可。

<div  align="center">
	<img src="../assets/observability.png" width = "350"  align=center />
</div>

其后，Cindy Sridharan 在其著作《Distributed Systems Observability》中，进一步讲到指标、追踪、日志是可观测性的三大支柱（three pillars）。


有了遥测数据的定义，那么只要是能分析应用程序性能、可用性，都是可观测的内容。最近，CNCF 又在官方《 Observability Whitepaper》中，提出了 Observability Signals 的概念，原来的三大支柱变成了 3 Primary Signals 以及 Profiles、Dumps。


## 可观测性生态

<div  align="center">
	<img src="../assets/cncf-observability.png" width = "100%"  align=center />
</div>

## 可观测性与监控

可观测性与监控有很多相近之处，事实也确实如此，并很容易引起误解。关于这一点《高性能 MySQL》 作者有一个非常著名的见解，被大家广泛引用：

:::tip 可观测与监控
监控告诉我们系统哪些部分是工作的，可观测性告诉我们那里为什么不工作了

-- by Baron Schwartz
:::

换句话解释就是监控可以发现问题，可观测性更好地定位问题。它们之间的关系有一个很有表达力的示意图，如下。

<div  align="center">
	<img src="../assets/Monitoring-vs-Observability.png" width = "450"  align=center />
</div>

但这并不意味着有可可观测性，就不需要监控了。监控室对系统的持续观察，检测异常行为并发出报警，要解决已知的未知问题。而可观测性透过系统的输出（指标、日志、追踪）了解系统的内部状态，告诉你发生了什么、为什么发生以及如何修复，解决未知的未知问题。

可观测性不能替代监控的讨论，有兴趣的读者可以阅读 《Observability will never replace Monitoring (because it shouldn’t)》[^1]，作者 Ben Sigelman 是 Google Dapper、时序数据库 Monarch 的共同创始人，也是可观测性领域最重要的两个标准 OpenTelemetry 和 OpenTracing 的共同创始人。

[^1]: 参见 https://medium.com/lightstephq/observability-will-never-replace-monitoring-because-it-shouldnt-eeea92c4c5c9


[^1]: 参见 https://cloud.google.com/learn/what-is-opentelemetry
[^2]: 参见 https://peter.bourgon.org/blog/2017/02/21/metrics-tracing-and-logging.html
