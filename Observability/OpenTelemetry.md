# 9.5 OpenTelemetry

收集应用数据并不是什么新鲜事。但是，从一个应用到另一个应用，收集机制和格式很少是一致的。这种不一致，对于只是试图了解应用健康状况的开发人员和 SRE 来说，可能是一场噩梦。


OpenTelemetry（也称为 OTel）是一个开源可观测能力框架，由一系列工具、API 和 SDK 组成

OpenTelemetry 的核心工作主要集中在三部分：
- 规范的制定和协议的统一，规范包含数据传输、API的规范，协议的统一包含：HTTP W3C的标准支持、gRPC等框架的协议标准。
- 多语言SDK的实现和集成，用户可以使用SDK进行代码自动注入和手动埋点，同时对其他三方库进行集成支持。
- 数据收集系统的实现，当前是基于OpenCensus Service的收集系统，包括 Agent 和 Collector。


<div  align="center">
	<img src="../assets/otel-diagram.svg" width = "550"  align=center />
</div>
OpenTelemetry 定位明确，专注于数据采集和标准规范的统一，对于数据如何去使用、存储、展示、告警，标准本身并不涉及。但就总体来说，可观测的技术方案成以下趋势：对于 Metrics 使用 Prometheus 做存储 Grafana 展示，使用 Jaeger 做分布式跟踪存储和展示，对于日志则使用 Loki 存储 Grafana 展示。