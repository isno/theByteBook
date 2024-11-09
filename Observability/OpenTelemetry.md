# 9.4 可观测标准项目的演进

构建可观测性的核心问题之一是：“如何实现数据的统一和关联，建立数据的血缘关系？”。但现状是，各类观测数据处理方案各不相同，使用的协议和数据格式也不一致，彼此难以兼容或互通。

Dapper 发布后，市场上涌现出大量追踪系统，如 Jaeger、Pinpoint、Zipkin 等。这些系统大多基于 Dapper 论文的原理实现，功能上虽无本质差异，但由于实现方式和技术栈不同，各自定义了采集标准和 SDK，导致这些追踪系统难以直接兼容或协同使用。

为解决追踪系统各自为政的乱象，一些老牌应用性能监控（APM）厂商（如 Uber、LightStep 和 Red Hat）联合定义了一套跨语言的、平台无关分布式追踪标准协议 —— OpenTracing。

开发者只要根据 OpenTracing 规范实现追踪逻辑接口，可以灵活地替换或组合探针、存储和界面等组件。2016 年，CNCF 正式接纳 OpenTracing 成为其第三个项目，前两个项目分别是鼎鼎大名的 Kubernetes 和 Prometheus。这标志着 OpenTracing 作为分布式系统可观测性领域的标准之一，得到了业界的广泛认可。

OpenTracing 推出不久之后，Google 和微软联合推出了 OpenCensus 项目。

OpenCensus 最初是 Google 内部监控工具，开源的目地并不是抢 OpenTracing 的饭碗，而是希望为分布式系统提供一个统一的、跨语言的、开箱即用的可观测性框架，既能够处理链路追踪（trace），又能够处理指标（metrics）。

虽说 OpenTracing 和 OpenCensus 推动了可观测性系统的发展，但它们作为可观测领域下的协议标准，彼此之间的竞争和分裂不可避免地消耗了大量社区资源。对于普通开发者而言，一边是老牌 APM 厂商，另一边是拥有强大影响力的 Google 和微软。选择困难症发作时，一个新的设想开始被不断讨论：“能否有一个统一的标准，能够同时支持指标、追踪和日志等各类遥测数据？”。

2019 年，OpenTracing 和 OpenCensus 的维护者决定将两个项目整合在一起，提供各类遥测数据统一采集解决方案 —— OpenTelemetry。

OpenTelemetry 覆盖了各类遥测数据规范定义、API 定义、规范实现以及数据的获取与传输。目标是解决的是遥测数据统一的第一步：通过 API 和 SDK 来标准化遥测数据采集和传输。之后，遥测数据如何使用、存储、展示和告警，OpenTelemetry 本身并不涉及。这使得 OpenTelemetry 既不会因动了“数据的蛋糕”，引起生态抵制，也极大保存了精力，得以专注实现兼容“所有的语言、所有的系统”的遥测数据采集器（OpenTelemetry Collector）。

如图 9-17 所示，集成了 OpenTelemetry 的可观测系统：
- 应用程序只需要一种 SDK 就可以实现所有类型遥测数据的统一产生；
- 集群只需要部署一个 OpenTelemetry Collector 便可以实现所有遥测数据的采集。

指标、链路追踪、日志等遥测数据一般具有相同的 Meta 信息（描述和标识数据的附加信息，如标签、时间戳、上下文信息等），可以做无缝关联。之后，你可以使用 Prometheus + Grafana 做指标的存储和展示，使用 Jaeger 做分布式跟踪的存储和展示。

:::center
  ![](../assets/otel-diagram.svg)<br/>
  图 9-17 集成 OpenTelemetry 的可观测架构 [图片来源](https://opentelemetry.io/docs/)
:::


自 2019 年发布，OpenTelemetry 便得到了广泛的社区支持。现如今，多数的云服务提供商和容器平台，如 AWS、Google Cloud、Azure、阿里云等均已开始支持和推广 OpenTelemetry。在复杂的微服务架构和云原生环境中，OpenTelemetry 已成为可观测领域遥测数据生成和收集的事实标准。