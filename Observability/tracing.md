# 9.4 链路追踪

微服务架构中，每个完整的请求会跨越多个服务（数十个甚至数百个），并在期间产生多次网络、RPC、消息、数据库等调用。参阅 Uber 公开的技术文档信息，它们的架构大约有 2,200 个服务，这个级别的微服务相互依赖的链路关系有多么复杂，笔者引用 Uber 博客中的配图[^1]，让你直观感受下。

<div  align="center">
	<img src="../assets/uber-microservice.png" width = "350"  align=center />
	<p>Uber 使用 Jaeger 生成的追踪链路拓扑</p>
</div>

分布式链路追踪诞生的标志性事件就是 Google Dapper 论文的发表。2010年4月，Benjamin H. Sigelman 等人在 Google Technical Report 上发表了《Dapper, a Large-Scale Distributed Systems Tracing Infrastructure》[^2]，揭开了分布式链路追踪的技术大幕，开启了一段全新的技术浪潮。


链路追踪系统并不遥远，就在你身边。我们来看看物流订单追踪，一个快递包裹会在发件站点被赋予一个快递单号，沿途的中转节点会记录该快递到达的时间等信息，而用户通过快递单号就可以查询自己的包裹途径了哪些站点，耗时多久，是否存在滞留或丢件的情况。


||物流追踪|链路追踪|
|:--|:--|:--|
|追踪对象| 快递包裹 | 服务请求 |
| 唯一标识| 快递单号 | 链路标识(traceId) |
|追踪信息| 包裹在不同地区的运输路线和状态 | 请求在分布式系统间的流转路径和状态|
|业务价值| 物流状态查询、丢件排查、物流提效| 性能瓶颈分析、错/慢请求排查、服务依赖梳理 |


## 追踪与跨度

Dapper 论文详细阐述了分布式链路追踪的设计理念，还提出了成为后续链路追踪系统设计的共识的两个概念：“追踪”（Trace）和“跨度”（Span）。

一条 Trace 代表一次入口请求在 IT 系统内的完整调用轨迹及其关联数据集合。其中，全局唯一的链路标识 TraceId，是最具代表的一个属性。通过 TraceId 我们才能将同一个请求分散在不同节点的链路数据准确的关联起来，实现请求粒度的“确定性关联”价值。这也是 Trace 区别于 Metrics、Log 其他两类可观测技术的关键属性。光有 TraceId 还不够，请求在每一跳的接口方法上执行了什么动作、耗时多久、执行状态是成功还是失败？承载这些信息的记录就是跨度（Span）。

每一次 Trace 实际上都是由若干个有顺序、有层级关系的 Span 所组成一颗“追踪树”（Trace Tree），如下图所示。通过 TraceId 将一次请求的所有链路日志进行组装，就能还原出该次请求的链路轨迹，

<div  align="center">
	<img src="../assets/Dapper-trace-span.png" width = "350"  align=center />
	<p>Trace 和 Spans</p>
</div>


## 生态

在没有形成大一统标准的早期，Dapper 的思想和协议影响了大量的开源项目。

受到 Dapper 的启发，Twitter 开发了自己的分布式追踪系统 Zipkin
Twitter 与 2012年开源了 ， Uber 于 2017年 开源了 Jaeger。即使在今天，Zipkin和 jaeger 仍然是最流行的分布式追踪工具之一。

<div  align="center">
	<img src="../assets/tracing.png" width = "550"  align=center />
	<p>CNCF 下分布式追踪系统生态</p>
</div>

随着分布式追踪技术的日益流行，有一个问题也日益突出，不同链路追踪系统和工具之间缺乏兼容性，如果使用了一个追踪系统，很难再切换到另一个。


CNCF 技术委员会发布了 OpenTracing 和 微软推出的 OpenCensus 两个竞品在 2019 年忽然宣布握手言和，共同发布了可观性的终极解决方案 OpenTelemetry。



## 追踪技术的核心

**1.基于日志的追踪**，基于日志追踪的思路是将 trace、span 等信息直接输入到应用日志中，然后随着所有节点的日志归集过程汇聚到一起，再从全局日志信息中反推出完成调用链拓扑关系。

这种方式的缺点是直接依赖日志归集过程，日志本身不追求绝对的连续与一致，这就导致基于日志的追踪，往往不如下面两种追踪实现来的精确。

日志追踪的代表产品是 SpringCloud Sleuth。

**2.基于服务的追踪**，基于服务的追踪是目前最为常见的追踪实现方式，被 Zipkin、SkyWalking、Pinpoint 等主流追踪系统广泛采用。基于服务追踪的实现思路是通过某些手段给目标应用注入追踪探针（Probe），譬如针对 Java 应用，一般就通过 Java Agent 注入。

探针可以看做是一个寄生在目标服务身上的一个小型微服务系统，它一般会有自己的专用服务注册、心跳检测等功能，有专门的数据收集协议，可以把从目标系统监控得到的服务调用信息，通过另一次独立的 HTTP 或者 RPC 请求发送给追踪系统。

因此，基于服务方式的追踪系统会比基于日志的追踪消耗更多的资源，也具有更强的侵入性，而换来的收益就是追踪的精确性和稳定性都有保证，不必再依靠日志归集来传输跟踪数据。


**3.基于边车代理的追踪**，服务网格的专属方案，也是最理想的分布式追踪模型，边车代理对应用完全透明，有自己独立数据通道，追踪数据通过控制平面上报，无论对日志服务本身还是，都不会有依赖和干扰；它与程序语言无法，无论应用采用什么编程语言，只要它通过网络（HTTP或 gRPC）访问服务，就可以被追踪到。如果非要总结种方式的实现有什么缺点，就是边车代理本身对应用透明的原理，决定了它只能实现服务调用层面的追踪。

现在，市场占有率最高的 Envoy 就提供了完善的追踪功能，但没有提供自己的界面端和存储端，需要配合专门的 UI 与存储系统来使用，不过 SkyWalking、Zipkin、Jaeger 等系统都可以接受来自 Envoy 的追踪数据。



## 未来




[^1]: 参见 https://www.uber.com/en-IN/blog/microservice-architecture/
[^2]: 参见《Dapper, a Large-Scale Distributed Systems Tracing Infrastructure》https://research.google/pubs/dapper-a-large-scale-distributed-systems-tracing-infrastructure/

[^3]: 参见 https://logz.io/gap/devops-pulse-2022/