# 9.5 小结

在可以预见的未来，相信可观测领域将形成一定意义的标准化。

首先是指标，Prometheus 作为云原生时代的指标数据标准已经形成共识。链路标准也随着 OpenTelemetry 的推行逐渐占据主流。在日志领域，虽然因数据结构化程度低，难以形成数据标准，但采集存储分析侧涌现出 Fluent、loki 等开源新秀。另一方面，Grafana 作为可观测数据展示标准也基本明朗。

最后，以期 OpenTelemetry 实现理想状态下 Logs、Trace、Metrics 三种数据协议标准大一统，使用一个 Agent 完成所有可观测性数据的采集和传输，再通过可扩展的存储，叠加上时间信息的关联，构建出理想中可观测基础设施，并发挥出真正的观测价值。

参考文档：
- 《Gorilla：快速、可扩展的内存时间序列数据库》https://blog.acolyer.org/2016/05/03/gorilla-a-fast-scalable-in-memory-time-series-database/
- https://github.com/open-telemetry/docs-cn/blob/main/OT.md

- https://medium.com/lightstephq/observability-will-never-replace-monitoring-because-it-shouldnt-eeea92c4c5c9

- 《What is inverted index, and how we made log analysis 10 times more cost-effective with it?》https://blog.devgenius.io/what-is-inverted-index-and-how-we-made-log-analysis-10-times-more-cost-effective-with-it-6afc6cc81d20

- 《从Opentracing、OpenCensus 到 OpenTelemetry，看可观测数据标准演进史》https://developer.aliyun.com/article/885649