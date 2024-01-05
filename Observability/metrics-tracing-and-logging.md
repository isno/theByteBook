# 什么是可观测性



分布式系统的可观测性跟控制论里面的可观测性是一致的，这种在其他领域借用的舶来概念并不稀奇，比如常见的“架构”、“设计模式” 等词汇与都是来自于建筑学的概念。


## 哪些是可观测性


那么，哪些是可观测性？可观测性有哪些核心内容？Google Cloud 在 OpenTelemetry 的介绍中，首先提到了这么一个概念[^1]：

:::tip telemetry data

The information that you will use to determine whether an application is healthy and performing as designed is called telemetry data. 
:::

事实上，我们进行可观测性，主要就是通过 telemetry data 进行的。可观测性使⽤三种类型的遥测数据：指标、⽇志和跟踪来提供对分布式系统的深⼊可⻅性，并允许团队找到⼤量问题的根本原因并提⾼系统性能。

早在 2017 年，Peter Bourgon 就把

学术界一般会将可观测性分解为三个更具体方向进行研究，它们分别是**事件日志、链路追踪和聚合度量**，这三个方向各有侧重，又不是完全独立，它们天然就有重合或者可以结合之处，2017 年的分布式追踪峰会结束后，Peter Bourgon 撰写了总结文章《Metrics, Tracing, and Logging》[^2]系统地阐述了这三者的定义、特征以及它们之间的关系与差异，受到了业界的广泛认可。

<div  align="center">
	<img src="../assets/observability.png" width = "350"  align=center />
</div>

其后，Cindy Sridharan 在其著作《Distributed Systems Observability》中，进一步讲到指标、追踪、日志是可观测性的三大支柱（three pillars）。


最近，CNCF 又在官方《 Observability Whitepaper》中，提出了 Observability Signals 的概念，原来的三大支柱变成了 3 Primary Signals 以及 Profiles、Dumps。

[^1]: 参见 https://cloud.google.com/learn/what-is-opentelemetry
[^2]: 参见 https://peter.bourgon.org/blog/2017/02/21/metrics-tracing-and-logging.html

