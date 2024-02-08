# 9.3 可观测性大一统

建设完善的可观测体系，很可能会形成链路监控、日志监控、指标监控等多套不同的监控系统，要打通是相当困难的。不同的业务线间，日志规则不互通，要完全互通也很困难。系统一旦过多，相关维护以及故障排除的时间成本就会大幅增加。


先是 CNCF 提出了 OpenTracing 分布式追踪的标准协议，定义了一套厂商无关、语言无关的规范，也有 Jaeger 、Zipkin 等项目的实现和支持。随后 Google 和微软提出了 OpenCensus 项目，在定义分布式追踪协议的基础上，规范了应用性能指标，并实现了一套标准的 API ，为可观测性能力统一奠定了基础。

经过对已有的标准协议不停的打磨和演变，最终 CNCF 提出了可观测性的终极项目 OpenTelemetry，它结合了 OpenTracing 与 OpenCensus 两个项目，成为了一个厂商无关、平台无关的支撑可观测性三大支柱的标准协议和开源实现。

OpenTelemetry 的核心工作主要集中在三部分：
- 规范的制定和协议的统一，规范包含数据传输、API的规范，协议的统一包含：HTTP W3C的标准支持、gRPC等框架的协议标准。
- 多语言SDK的实现和集成，用户可以使用SDK进行代码自动注入和手动埋点，同时对其他三方库进行集成支持。
- 数据收集系统的实现，当前是基于OpenCensus Service的收集系统，包括 Agent 和 Collector。

<div  align="center">
	<img src="../assets/otel-diagram.svg" width = "550"  align=center />
</div>

OpenTelemetry 定位明确，专注于数据采集和标准规范的统一，对于数据如何去使用、存储、展示、告警，标准本身并不涉及。但就总体来说，可观测的技术方案成以下趋势：对于 Metrics 使用 Prometheus 做存储 Grafana 展示，使用 Jaeger 做分布式跟踪存储和展示，对于日志则使用 Loki 存储 Grafana 展示。


OpenTelemetry 的特点在于制定统一的协议数据格式，并提供底层数据采集器。这使得 OpenTelemetry 既不会因动了“数据的蛋糕”，引起生态抵制，也极大保存了精力，得以专注于数据采集器，努力去兼容“所有的语言、所有的系统”。