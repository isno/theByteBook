# 9.5 小结


从迈入云原生的那一刻起，业务弹性场景变化节奏加快，工作负载生命周期缩短、服务之间的链路关系更加复杂。在轻量、多变、短生命周期的云原生环境中，只有获取足够多的系统运行数据，才得以对事件的根因进行分析，对故障行为进行溯源，对未知威胁进行预测。



可以预见的未来，相信可观测领域将形成一定意义的标准化。

首先是指标，Prometheus 作为云原生时代的指标数据标准已经形成共识。链路标准也随着 OpenTelemetry 的推行逐渐占据主流。在日志领域，虽然因数据结构化程度低，难以形成数据标准，但采集存储分析侧涌现出 Fluent、Loki 等开源新秀。另一方面，Grafana 作为可观测数据展示标准也基本明朗。

最后，CNCF 孵化的 OpenTelemetry ，实现 Logs、Traces、Metrics 三种数据协议底层标准定义、采集大一统，建设可扩展/低成本/统一的可观测平台未来可期。

参考文档：
- 《Gorilla：快速、可扩展的内存时间序列数据库》https://blog.acolyer.org/2016/05/03/gorilla-a-fast-scalable-in-memory-time-series-database/
- https://github.com/open-telemetry/docs-cn/blob/main/OT.md

- https://medium.com/lightstephq/observability-will-never-replace-monitoring-because-it-shouldnt-eeea92c4c5c9

- 《What is inverted index, and how we made log analysis 10 times more cost-effective with it?》https://blog.devgenius.io/what-is-inverted-index-and-how-we-made-log-analysis-10-times-more-cost-effective-with-it-6afc6cc81d20

- 《从Opentracing、OpenCensus 到 OpenTelemetry，看可观测数据标准演进史》https://developer.aliyun.com/article/885649