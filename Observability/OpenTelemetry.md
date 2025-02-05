# 9.4 可观测标准的演进

Dapper 论文发布后，市场上涌现出大量追踪系统，如 Jaeger、Pinpoint、Zipkin 等。这些系统都基于 Dapper 论文实现，功能上无本质差异，但实现方式和技术栈不同，导致它们难以兼容或协同使用。

为解决追踪系统各自为政的乱象，一些老牌应用性能监控（APM）厂商（如 Uber、LightStep 和 Red Hat）联合定义了一套跨语言的、平台无关分布式追踪标准协议 —— OpenTracing。

开发者只需按照 OpenTracing 规范实现追踪接口，便可灵活替换、组合探针、存储和界面组件。2016 年，CNCF 将 OpenTracing 收录为其第三个项目，前两个分别是大名鼎鼎的 Kubernetes 和 Prometheus。这一举措标志着 OpenTracing 作为分布式系统可观测性领域的标准之一，获得了业界的广泛认可。

OpenTracing 推出后不久，Google 和微软联合推出了 OpenCensus 项目。OpenCensus 起初是 Google 内部的监控工具，开源的目的并非与 OpenTracing 竞争，而是希望为分布式系统提供一个统一的、跨语言的、开箱即用的可观测性框架，不仅仅处理链路追踪（tracing）、还要具备处理指标（metrics）的能力。

虽说 OpenTracing 和 OpenCensus 推动了可观测性系统的发展，但它们作为协议标准，彼此之间的竞争和分裂不可避免地消耗了大量社区资源。对于普通开发者而言，一边是老牌 APM 厂商，另一边是拥有强大影响力的 Google 和微软。选择困难症发作时，一个新的设想不断被讨论：“能否有一个标准方案，同时支持指标、追踪和日志等各类遥测数据？”。

2019 年，OpenTracing 和 OpenCensus 的维护者决定将两个项目整合在一起，形成了现在的 OpenTelemetry 项目。OpenTelemetry 做的事情是，提供各类遥测数据统一采集解决方案。

如图 9-17 所示，集成了 OpenTelemetry 的可观测系统：

- 应用程序只需要一种 SDK 就可以实现所有类型遥测数据的生产；
- 集群只需要部署一个 OpenTelemetry Collector 便可以采集所有的遥测数据。

:::center
  ![](../assets/otel-diagram.svg)<br/>
  图 9-17 集成 OpenTelemetry 的可观测架构 [图片来源](https://opentelemetry.io/docs/)
:::

至于遥测数据采集后如何存储、展示、使用，OpenTelemetry 并不涉及。你可以使用 Prometheus + Grafana 做指标的存储和展示，也可以使用 Jaeger 做链路追踪的存储和展示。这使得 OpenTelemetry 既不会因动了“数据的蛋糕”，引起生态抵制，也保存了精力，专注实现兼容“所有的语言、所有的系统”的“遥测数据采集器”（OpenTelemetry Collector）。

自 2019 年发布，OpenTelemetry 便得到了社区的广泛支持。绝大部分云服务商，如 AWS、Google Cloud、Azure、阿里云等均已支持和推广 OpenTelemetry，各种第三方工具（如 Jaeger、Prometheus、Zipkin）也逐步集成 OpenTelemetry，共同构建了丰富的可观测性生态系统。