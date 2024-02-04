# 9.2 可观测性数据分类

工业界和学术界一般会将可观测性的遥测数据分解为三个更具体方向进行研究，它们分别是**事件日志（Logging）、链路追踪（Tracing）和聚合度量（Metrics）**。

- Metrics（聚合度量）：一般用来计算事件发生数量的数据集，这些数据通常具有原子性、且可以聚合。从操作系统到应用程序，任何事物都会产生 Metrics 数据，这些数据可以用来度量操作系统或者应用是否健康。
- Logging（事件日志）：描述一系列离散的事件，在缺乏有力的监控系统时，Logging 数据通常是工程师在定位问题时最直接的手段。如果说 Metrics 告诉你应用程序出现问题，那么 Logging 就告诉你为什么出现问题。
- Tracing（链路追踪）：分布式系统中多个服务之间或多或少存在依赖，Tracing 通过有向无环图的方式记录分布式系统依赖中发生事件之间的因果关系。


2017 年的分布式追踪峰会结束后，Peter Bourgon 撰写了总结文章《Metrics, Tracing, and Logging》[^1]系统地阐述了这三者的定义、特征以及它们之间的关系与差异，受到了业界的广泛认可。

<div  align="center">
	<img src="../assets/observability.png" width = "350"  align=center />
</div>

来自于 Cindy Sridharan 的《Distributed Systems Observability》著作中进一步将这三个类型的数据称为可观测性的三大支柱（three pillars），不过将它们成为支柱容易让人产生误解，支柱就像一个房子的均匀受力支撑点，缺一不可。而事实上这三者都可以独立存在，系统中只存在 Logging、Tracing 也未尝不可。所以，在最新 CNCF 发布的可观测性白皮书中，将这些可观测的数据统一称为信号（Signals），主要的信号除了 Metrics、logs、traces 之外又额外增加了  Profiles 和 Dumps。

## 可观测数据联系

<div  align="center">
	<img src="../assets/observability-signals.png" width = "650"  align=center />
</div>


1. 最开始我们通过各式各样的预设报警发现异常（通常是Metrics/Logs）。
2. 发现异常后，打开监控大盘查找异常的曲线，并通过各种查询/统计找到异常的模块（Metrics）。
3. 对这个模块以及关联的日志进行查询/统计分析，找到核心的报错信息（Logs）。
4. 最后通过详细的调用链数据定位到引起问题的代码（Traces/Code）。


通常的事件响应首先是从报警开始的，然后通过一些 Dashboard 查看信息，然后再指出错误的服务、主机或者实例。然后，工程师将尝试查找该服务、主机或者实例在该时间范围内的日志，希望能找到根本原因。由于当前的情况是指标和日志存储在两个不同的系统中，所以工程师们需要将查询从一种语言和界面切换到另外一种语言去操作。



该设计的第一个目的是将日志和指标之间的上下文切换成本降到最低。

[^1]: 参见 https://peter.bourgon.org/blog/2017/02/21/metrics-tracing-and-logging.html
