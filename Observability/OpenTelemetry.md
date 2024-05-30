# 9.3 可观测性标准演进

几乎所有的追踪系统都以 Dapper 论文为原型实现，各个系统功能并没有本质差别，但又受限于实现细节，很难搭配工作。

为了解决追踪系统各自为政的乱象，一些老牌 APM 所代表的厂商（Uber、LightStep、Redhat）提出了 OpenTracing 分布式追踪的标准协议，定义了一套厂商无关、语言无关的规范。**只要遵守 OpenTracing 规范，任何公司的追踪探针、存储、界面就可以互换或者组合**。OpenTracing 规范提出之后，业内知名的追踪系统 Jaeger 、Zipkin、Skywalking 等项目很快宣布宣布实现和支持 OpenTracing。也是基于这一点，2016 年云原生计算基金会 CNCF 正式接纳 OpenTracing，顺利成为 CNCF 第三个项目。

OpenTracing 推出不久之后，Google 成为异意者，和微软推出了 OpenCensus 项目。

OpenCensus 在定义分布式追踪协议的基础上，**新纳入了指标度量，还提供了包含 Agent 和 Collector SDK 的实现**。遵循 OpenCensus 协议的产品有 Prometheus、SignalFX、Stackdriver 和 Zipkin 等。

对很多开发人员而言，一边是老牌 APM 厂商，一边是影响力巨大的 Google 和微软。选择困难症发作的同时，一个新的想法不断被讨论：**是否能有一个统一标准，能够同时支持 Metrics、Tracing、Logs 相关可观测数据的项目呢？**

为了更好的将 Traces、Metrics 和 Logs 融合在一起，OpenTelemetry（简称 OTel）诞生了。作为 CNCF 的孵化项目，OpenTelemetry 由 OpenTracing 和 OpenCensus 项目合并而成，为众多开发人员带来 Metrics、Tracing、Logs 的统一标准，并提供了一组针对多语言的开箱即用的 SDK 实现工具。

OpenTelemetry 定位明确：**专注于数据采集和标准规范的统一，对于数据如何去使用、存储、展示、告警，标准本身并不涉及**。这使得 OpenTelemetry 既不会因动了“数据的蛋糕”，引起生态抵制，也极大保存了精力，得以专注于数据采集器，努力去兼容“所有的语言、所有的系统”。

如下图所示，集成 OpenTelemetry 可观测建设：
- 只需要一种 SDK 就可以实现所有类型数据的统一产生；
- 集群只需要部署一个 OpenTelemetry Collector 便可以实现所有类型数据的采集。

<div  align="center">
	<img src="../assets/otel-diagram.svg" width = "550"  align=center />
</div>


