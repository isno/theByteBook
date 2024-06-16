# 9.3.1 聚合度量

思考接口请求数、请求延迟、节点的负载以及内存占用等类似的数据有什么特点呢？可量化（都是纯数字的）、具有时间属性且可聚合。对可度量的数据（Metrics）收集聚合、分析（判断度量指标是否超过风险阈值），然后再处理（触发报警事件）。

这一些列的流程，不正是监控系统的主要工作么？提到监控系统，那一定聊聊 Prometheus，Prometheus 是云原生时代最流行的监控系统。

:::tip 额外知识
Google 的 Borg 系统孕育出了 Kubernetes，Prometheus 的前身 —— Google 内部的监控系统 Brogmon 则由前 Google工程师在 Soundcloud 以开源软件的形式继承下来。
:::

如图 9-4 所示的 Prometheus 架构，它通过不同的子功能实现埋点采集、爬取和传输、存储、计算、展示等，再通过搭积木的方式，组合出一个以应用为中心，功能强大的监控告警系统。

:::center
  ![](../assets/prometheus-arch.png)<br/>
  图 9-4 Prometheus 的架构设计
:::

总结对 metrics 的处理以及分析 Prometheus 架构，所有监控系统总体上要解决的问题其实就 3 个：

1. 监控指标用什么形式表示（确定指标的数据模型）。
2. 怎么收集和存储指标。
3. 怎么利用指标生成报表。

## 1. 数据模型

Prometheus 的数据模型，简而言之就是一个时序类型的 Metric 数据，它主要由四个部分组成：metric 名称、labels、时间戳和数值。
```
<metric_name>{<label_name1>="<label_value1>", <label_name2>="<label_value2>", ...} <value> [<timestamp>]
prometheus_http_requests_total{status="200", method="GET"} 12345 1618324800000
```
指标名称表示被监控样本的含义，譬如 http_request_total 表示当前系统接收到的 HTTP 请求总量，标签反应当前样本的特征维度，通过这些维度 Prometheus 对样本数据进行过滤，聚合等，数值表示度量的实际值，时间戳为数据收集的时间。

以 Prometheus 为例，它支持四种不同指标表示类型：

- **Counter（计数器）**: Counter 类型的指标其工作方式和计数器一样，初始为 0，只增不减（除非系统发生重置）。常见的监控指标，如 http_requests_total，node_cpu 都是 Counter 类型的监控指标。
- **Gauge（仪表盘）**：与 Counter 不同，Gauge 类型的指标侧重于反应系统的当前状态。因此这类指标的样本数据可增可减。常见指标如：node_memory_MemFree（主机当前空闲的内容大小）、node_memory_MemAvailable（可用内存大小）都是Gauge类型的监控指标。
- **Histogram（直方图）**：观测采样统计分类数据，观测数据放入有数值上界的桶中，并记录各桶中数据的个数。典型的应用有延时在 `0~50ms` 的请求数，500ms 以上慢查询数，大 Key 数等。
- **Summary（摘要）**：聚合统计的多变量，跟 Histogram 有点像，但更有聚合总数的概念。典型应用有成功率、总体时延、总带宽量等。

## 2. 收集指标

不同监控系统收集 Metrics 数据基本就两种方式：

- 通过 push 到中心 Collector 方式采集（譬如各种 Agent 采集器，Telegraf 等）；
- 又或者是中心 Collector 通过 pull 的方式主动获取。

如图 9-5 所示，Prometheus 主动从监控源拉取暴露的 HTTP 服务地址（通常是/metrics）拉取监控样本数据。

:::center
  ![](../assets/prometheus-exporter.png)<br/>
  图 9-5 Prometheus 通过 Exporter 的实例 target 中主动拉取监控数据
:::

:::tip Exporter
Exporter 一个相对开放的概念，可以是一个独立运行的程序独立于监控目标以外，也可以是直接内置在监控目标中，只要能够向 Prometheus 提供标准格式的监控样本数据即可。
:::

Prometheus 相比 zabbix 这类只监控机器的传统监控系统，最大的特点是对 Metrics 全方位的覆盖：

- **宿主机监控数据**：Node Exporter 以 DaemonSet 的方式运行在宿主机，收集节点的负载、CPU、内存、磁盘以及网络这样的常规机器的数据。
- **Kubernetes 本身的运行情况**：Kubernetes 的 API Server、Kubelet 等组件内部通过暴露 /metrics 接口，向 Prometheus 提供各个 Controller 工作队列、请求 QPS 等 Kubernetes 本身工作的情况。
- **Kubernetes Workload 相关的监控**：kuelet 内置的 cAdvisor 服务把 Metrics 信息细化到每一个容器的 CPU、文件系统、内存、网络等资源使用情况。
- **业务的监控**：用户在应用内实现 Exporter，自定义出各式各样的 Metrics。

除了上述监控范围，Prometheus 的社区也涌现出大量各种用途的 Exporter，如表 9-1 所示，涵盖了从基础设施、中间件以及网络等各个方面，让 Prometheus 的监控范围涵盖用户关心的所有目标。

:::center
表 9-1 Prometheus 中常用 Exporter
:::

| 范围 | 常用 Exporter |
|:--|:--|
 | 数据库 |  MySQL Exporter、Redis Exporter、MongoDB Exporter、MSSQL Exporter 等 | 
 | 硬件 | Apcupsd Exporter、IoT Edison Exporter、IPMI Exporter、Node Exporter 等 | 
 | 消息队列 |  Beanstalkd Exporter、Kafka Exporter、NSQ Exporter、RabbitMQ Exporter 等 |
 | 存储 | Ceph Exporter、Gluster Exporter、HDFS Exporter、ScaleIO Exporter 等 | 
 | HTTP服务 | Apache Exporter、HAProxy Exporter、Nginx Exporter 等 |
 | API服务 | AWS ECS Exporter、Docker Cloud Exporter、Docker Hub Exporter、GitHub Exporter 等 | 
 | 日志 | Fluentd Exporter、Grok Exporter 等 | 
 | 监控系统 |  Collectd Exporter、Graphite Exporter、InfluxDB Exporter、Nagios Exporter、SNMP Exporter 等 |
 | 其它 | Blockbox Exporter、JIRA Exporter、Jenkins Exporter、Confluence Exporter 等|

## 3. 存储指标

如果 Metrics 数据的主要作用是监控，那么你要考虑这类数据有没有长期存储的必要？

默认情况下，Prometheus 将数据存储在内置的 TSDB（时序数据库）中，并设定了默认的存储时限。这个数据库的设计初衷是为了实现监控数据的高性能查询，而非分布式处理，如果本地磁盘或节点出现故障，存储将无法扩展和迁移。

当然 Prometheus 也考虑了长期存储的场景，你可以通过 Prometheus 的远端存储扩展（Remote Read/Write API）将数据存储到任意第三方存储上。目前，社区已经涌现出大量适用于长期时序数据存储的解决方案，如 Thanos、VictoriaMetrics、SignalFx、InfluxDB 和 Graphite 等。

如图 9-61 所示的 Prometheus 长期存储方案对比，读者可以根据这些对比，选择最适合自己的方案。

:::center
  ![](../assets/prometheus-storage.jpeg)<br/>
  图 9-6 长期存储方案对比
:::

## 4. 生成报表

在仪表可视化领域，如果 Grafana Dashboard 称第二，应该没有敢窜出来称第一的。

Grafana Labs 公司成立之前，Grafana Dashboard 就已经在各个开源社区有不小的名气和用户积累。依靠社区的用户基础，Grafana Labs 也快速地将产品渗透至各个企业，各类大场面也时不时会见到 Grafana 的身影[^1]：
- 2016年，在猎鹰9号火箭首次发射期间，Grafana 出现在 SpaceX 控制中心的屏幕上；
- 几周后，微软发布一段宣传视频，展示了他们的水下数据中心，同样出现了 Grafana 的身影。

Grafana 的 slogan 是“Dashboard anything. Observe everything.” ，Prometheus 定义了功能强大的 promQL，可以满足各种复杂的查询场景。而 Grafana 提供了对 PromQL 的完整支持。两者结合的结果是：只要你能想到的数据就能转成任何你想要的图表。

:::center
  ![](../assets/grafana-dashboard-english.png)<br/>
  图 9-7 通过 PromQL 查询数据，Grafana 监控仪表盘
:::

[^1]: 参见 https://grafana.com/blog/2023/09/26/celebrating-grafana-10-top-10-oh-my-grafana-dashboard-moments-of-the-decade/
