# 9.3.1 指标数据的收集与处理

指标（Metrics）是监控的代名词。与日志不同，日志是对应用程序操作的一种记录，而监控更多是通过对指标数据的聚合，来对应用程序在特定时间内行为的衡量。


提到监控系统，避不开 Prometheus，Prometheus 已经成为云原生中指标监控的事实标准。
:::tip 额外知识
Google 的 Borg 系统孕育出了 Kubernetes，Prometheus 的前身 —— Google 内部配套的监控系统 Brogmon 则由前 Google工程师在 Soundcloud 以开源软件的形式继承下来。
:::

如图 9-4 所示的 Prometheus 架构，
Prometheus 的架构包括 Prometheus Server、Client、Push Gateway、Exporters 和 Alertmanager 等组件，它们共同构成了一个完整的监控系统。Prometheus Server 负责收集、存储和查询时间序列数据；Client 负责生成监控指标并暴露给 Prometheus Server；Push Gateway 用于处理短期任务的监控数据；Exporters 用于将第三方服务的监控数据转换为 Prometheus 可以理解的格式；Alertmanager 负责处理告警。

它通过不同的子功能实现指标采集、存储、计算和展示等，再通过搭积木组合出一个以应用为中心，功能强大的监控告警系统。Prometheus 中核心组件的说明如下：

- Prometheus Server：基于指标的监控系统的大脑，Prometheus Server 的主要工作是使用拉模型（Pull）从各个目标收集指标，然后存储为时间序列数据，并提供查询和分析接口。
- Service Discovery（服务发现）：在微服务、容器化、云环境等动态系统中，服务的 IP 地址、端口、实例等经常发生变化。Prometheus 通过 Kubernetes、Consul、DNS 等多种服务发现机制，能够自动发现被监控目标，并从中抓取数据，无需手动配置。
- Alertmanager：处理来自 Prometheus Server 的告警信息。它负责将告警路由到不同的通知渠道，如电子邮件、Slack、PagerDuty 等，并支持告警抑制、告警分组等功能。

- Pushgateway：Prometheus 默认使用拉取模型（也就是 pull 的方式）来抓取指标，然而有些场景是需要业务主动将指标 Push 到 Prometheus。笔者举一个 Kubernetes cronjob 上运行的一个批处理作业示例帮你理解，该作业每天根据某些事件运行 5 分钟。在这种情况下，Prometheus 将无法使用拉机制正确抓取服务级别指标。因此，我们需要将指标推送到 prometheus，而不是等待 prometheus 拉取指标。Pushgateway 相当于一个中间代理，批处理作业可以使用 HTTP API 将指标推送到 Pushgateway。然后 Pushgateway 在 /metrics 端点上公开这些指标。然后 Prometheus 从 Pushgateway 中抓取这些指标。
- Alert Manager：Prometheus 监控系统的关键部分。它的主要工作是根据 Prometheus 警报配置中设置的指标阈值发送警报。警报由 Prometheus 触发（注意，是由 Prometheus 进程触发原始告警）并发送到 Alertmanager。Alertmanager 对告警去重、抑制、静默、分组，最后使用各类通知媒介（电子邮件、slack 等）发出告警事件。

:::center
  ![](../assets/prometheus-arch.png)<br/>
  图 9-4 Prometheus 的架构设计
:::



## 1. 定义指标的类型

为方便用户使用和理解不同指标之间的差异，Prometheus 定义了四种不同的指标类型：

- 计数器（Counter）: Counter 类型的指标其工作方式和计数器一样，初始为 0，只增不减（除非系统发生重置）。常见的监控指标如 http_requests_total、node_cpu 等都是 Counter 类型的监控指标。
- **Gauge（仪表盘）**：与 Counter 不同，Gauge 类型的指标侧重于反应系统的当前状态，因此这类指标的样本数据可增可减。常见指标如 node_memory_MemFree（主机当前空闲的内容大小）、node_memory_MemAvailable（可用内存大小）都是 Gauge 类型的监控指标。
- **Histogram（直方图）**：观测采样统计分类数据，观测数据放入有数值上界的桶中，并记录各桶中数据的个数。典型的如延时在 `0~50ms` 的请求数，500ms 以上慢查询数，大 Key 数等。
- **Summary（摘要）**：聚合统计的多变量，跟 Histogram 有点像，但更有聚合总数的概念。典型的有有成功率、总体时延、总带宽量等。

:::center
  ![](../assets/four-metrics-type.png)<br/>
  图 9-5 Prometheus 定义的四种不同的指标类型
:::


## 2. 通过 Exporter 收集指标

定义完指标的类型之后，接下来的工作是把指标从监控的目标收集起来。

但问题是，对于大量现有的服务、系统甚至硬件，它们并不会暴露 Prometheus 格式的指标，比如：

- Linux 的很多指标信息以文件形式记录在 proc 下的各个目录中，如 /proc/meminfo 里记录内存信息, /proc/stat 里记录 CPU 信息;
- Redis 的监控信息需要通过 INFO 命令获取;
- 路由器等硬件的监控信息需要通过 SNMP 协议获取;

要监控这些目标，我们有两个方法：一是改动目标系统的代码, 让它主动暴露 Prometheus 格式的指标。第二种是编写一个代理服务, 将其它监控信息转化为 Prometheus 格式的指标。


Prometheus 收集指标的方式很简单，作用是把从目标采集到的监控数据转换为 Prometheus 标准格式的指标类型，再将指标以 HTTP（（接口通常是 /metrics）的方式暴露给 Prometheus。

如下，从一个 metrics 接口获取类型指标为 Counter 样本。
```bash
$ curl http://127.0.0.1:8080/metrics | grep http_request_total
# HELP http_request_total The total number of processed http requests
# TYPE http_request_total counter // 指标类型 类型为 Counter
http_request_total 5
```

广义上讲，所有可以向 Prometheus 提供监控样本数据的程序都可以被称为一个 Exporter，Exporter 的一个实例被称为 target，Prometheus 会通过轮询的形式定期从这些 target 中获取样本数据。这样的好处是 Prometheus 可以控制采集频率，保证自身系统的稳定。

:::center
  ![](../assets/prometheus-exporter.png)<br/>
  图 9-5 Prometheus 通过 Exporter 的实例 target 中主动拉取监控数据
:::

Prometheus 相比 zabbix 这类传统监控系统，最大的特点是对指标全方位的收集：

- **宿主机监控数据**：Node Exporter 以 DaemonSet 的方式运行在宿主机，收集节点的负载、CPU、内存、磁盘以及网络这样的常规机器的数据。
- **Kubernetes 本身的运行情况**：Kubernetes 的 API Server、Kubelet 等组件内部通过暴露 /metrics 接口，向 Prometheus 提供各个 Controller 工作队列、请求 QPS 等 Kubernetes 本身工作的情况。
- **Kubernetes Workload 相关的监控**：kuelet 内置的 cAdvisor 服务把 Metrics 信息细化到每一个容器的 CPU、文件系统、内存、网络等资源使用情况。
- **业务的监控**：用户在应用内实现 Exporter，自定义出各式各样的 Metrics。

除了上述监控范围，Prometheus 社区也涌现出大量各种用途的 Exporter。如表 9-1 所示，涵盖了从基础设施、中间件以及网络等各个方面，让 Prometheus 的监控范围涵盖用户关心的所有目标。

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

存储本来是一种司空见惯的操作，但如果是指标类型的数据，你需要换个思路来解决存储的问题。举个例子，假设你负责一个小型的集群（只有 10 个节点），集群中运行一套微服务系统（30 个服务），每个节点要采集 CPU、内存、磁盘以及网络，每个服务要采集业务相关、中间件相关指标。这些累加在一起总共算 20 个指标，如果按 5 秒的频率采集，那么一天的数据规模是：

```
10（节点）* 30（服务）* 20 (指标) * (86400/5) （秒） = 103,680,000（记录）
```

对于一个规模仅有 10 个节点的业务而言，`7*24` 小时不间断地生成数据，有时一天的数据量就超过 1 TB。虽然，你也可以用关系数据库或 NoSQL 数据库来处理时序数据，但这类数据库并没有充分利用时序数据的特点，需要源源不断投入更多的计算资源和存储资源来处理，系统的运营维护成本急剧上升。

如何低成本的存储这些海量数据，是个关乎系统可用的重要课题。我们回顾指标数据有什么特征？

```json
  {
    "metric": "http_requests_total",  // 指标名称，表示 HTTP 请求的总数
    "labels": {                       // 标签，用于描述该指标的不同维度
      "method": "GET",                // HTTP 请求方法
      "handler": "/api/v1/users",     // 请求的处理端点
      "status": "200",                // HTTP 响应状态码
    },
    "value": 1458,                    // 该维度下的请求数量
  },
```

纯数字、具有时间属性，它们肯定也有关系嵌套、不用考虑主键/外键、不用考虑事务处理。对于这类基于时间，揭示其趋势性、规律性的数据，业界也发展出了专门优化的数据库类型 —— 时序数据库（Time-Series Database）。

时序数据库其实并不是一个新鲜的概念，追溯其历史，1999 年问世的 RRDtool 应该是最早的专用时序数据库。2015 年起，时序数据库逐步开始流行。现在，在排行网站 DB-engines 上面，时序数据库已成为流行度最高的数据库。时序数据库（TSDB）与常规数据库（如关系型数据库或 NoSQL 数据库）在设计和用途上存在显著区别。笔者列举部分差异供你参考：

- 数据结构：时序数据库专为处理时间序列数据而设计。数据通常包括时间戳、测量值和标签。例如，如图所示的时序数据库结构，其中索引为时间戳（timestamp），不同的列记录了在该时间戳下的属性值。metric 表示度量（类似于关系型数据库中的表），data point 表示数据点（类似于关系型数据库中的行），field 是度量下随时间戳变化的属性值，tags 是附加的属性信息。

:::center
  ![](../assets/tsdb.svg)<br/>
  图 9-7 时序数据库结构
:::

- 数据写入：时序数据库使用 LSM-Tree（Log-Structured Merge-Tree）来替代常规数据库中的 B+Tree。在时序数据库中，所有写入操作首先写入内存存储区（MemTable，通常为跳表或平衡树）。当 MemTable 满时，数据会被批量写入磁盘文件中。虽然磁盘写入延迟较高，但由于批量操作，时序数据库在写入吞吐量上通常优于传统关系数据库（使用 B+Tree）。
- 数据保留策略：时序数据通常有明确的生命周期，例如监控数据可能只需保留几天或几个月。时序数据库通常具有自动化的数据保留策略（data retention），以防止存储空间无限膨胀。例如，可以设置基于时间的保留策略，保留最近 30 天的数据，超过 30 天的数据将自动删除。


默认情况下，Prometheus 将数据存储在本地 TSDB 中，并设定了默认的存储时限（15天），这种设计的理念基于“指标数据通常反映短期内的系统行为假设，而非长期/可靠分布式存储”。默认保留 15 天的数据，超过时间的数据会自动删除。Prometheus 的本地存储主要针对短期数据监控，若需要长期存储，可通过远程存储扩展（Remote Read/Write API）与外部存储系统集成。Thanos、Cortex、VictoriaMetrics、Mimir 等方案都可以为 Prometheus 提供长期存储、水平扩展、高可用性和多租户支持。

Prometheus 最大的一个特点是其 PromQL 是 Prometheus 内置的数据查询语言，其提供对时间序列数据丰富的查询，聚合以及逻辑运算能力的支持，同时 PromQL中 还提供了大量的内置函数可以实现对数据的高级处理。被广泛应用在 Prometheus 的日常应用当中，包括对数据查询、可视化、告警处理当中。

例如，计算最近 5 分钟内 HTTP 请求总数的速率，并对所有实例的请求进行求和。

```PromQL
sum(rate(http_requests_total[5m])) 表示
```


## 4. 展示分析/预警

采集/存储指标最终目的要用起来，也就是要“展示分析”以及“预警”。


在数据分析和可视化领域，Grafana Labs 公司开发的 Grafana 已成为事实上的标准。最初，Grafana 专注于时间序列数据的监控与分析，但随着项目的发展，它已经扩展到所有需要数据可视化和监控的场景，包括 IT 运维、应用性能监控以及物联网、金融、医疗等行业。

图 9-17 展示了一个 Grafana 仪表板（Dashboard）。在这个仪表板中，有两个关键概念：


- 数据源（Data Source）：在 Grafana 中，数据源指的是为其提供数据的服务。Grafana 支持多种数据源，包括时序数据库（如 Prometheus、Graphite、InfluxDB）、日志数据库（如 Loki、Elasticsearch）、关系型数据库（如 MySQL、PostgreSQL），以及云监控平台（如 Google Cloud Monitoring、Amazon CloudWatch、Azure Monitor）。Grafana 插件库中提供了多达 165 种数据源。如果找不到某个特定的数据源，那通常意味着该数据源已经被市场淘汰。
- 面板（Panel）：面板是仪表板中的基本构建块，用于显示各种可视化图表。Grafana 提供了多种图表类型，如仪表盘、表格、折线图、柱状图、热力图、饼图和直方图等。每个面板可以单独配置，并具备交互选项。通过 Panel 的 Query Editor（查询编辑器），可以为每个面板设置不同的数据源。例如，如果以 Prometheus 作为数据源，那在 Query Editor 中，我们使用 PromQL 查询语言从 Prometheus 中查询出相应的数据，并且将其可视化。Grafana 支持多种数据源，每个面板可配置不同的数据源，这样就可以在一个统一的界面上（仪表板）整合和展示来自多种不同系统的数据。

Grafana 几乎涵盖了所有的数据源和图表类型。正如 Grafana 的宣传语所说：“Dashboard anything. Observe everything.”，只要你能想到的数据，都能转化为你想要的图表。

:::center
  ![](../assets/grafana-dashboard-english.png)<br/>
  图 9-7 Grafana 的仪表盘
:::


在预警方面，Prometheus 负责数据采集和预警信息的生成，而 Alertmanager 则专门处理这些预警信息。以下是一个具体的例子，展示如何使用 Prometheus 告警规则来监控某个 HTTP 接口的 QPS。

```yaml
groups:
  - name: example-alerts
    rules:
    - alert: HighQPS
      expr: sum(rate(http_requests_total[5m])) by (instance, job) > 1000
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High QPS detected on instance {{ $labels.instance }}"
        description: "Instance {{ $labels.instance }} (job {{ $labels.job }}) has had a QPS greater than 1000 for more than 5 minutes."
```

这段规则会定期通过 PromQL 语法检测过去 5 分钟内某个被监控目标（instance）中的某个具体服务（job）的 QPS 是否大于 1000。如果条件满足，Prometheus 就会触发告警，并将其发送到 Alertmanager。Alertmanager 对告警进行进一步处理，例如：

- 分组（Grouping）：将具有相似标签的告警进行分组，以减少告警冗余。例如，若多个实例的故障告警属于同一服务，Alertmanager 可以将这些告警合并为一个群组发送，而不是发送多个独立的通知。
- 抑制（Inhibition）：定义规则来抑制某些告警的触发。当某个重要告警已触发时，可以避免其他相关但不那么重要的告警再次触发，从而防止告警风暴。例如，当整个服务宕机时，单个实例宕机的告警可以被抑制。
- 静默（Silencing）：在特定时间段内禁用某些告警通知。静默操作可以通过指定标签、持续时间和备注等条件设置，常用于维护期间的告警屏蔽。
- 路由（Routing）：根据告警标签或其他规则将告警路由到不同的接收端。Alertmanager 支持通过标签、优先级等条件进行灵活的路由设置。例如，将高优先级告警发送到短信和电话通知，而将低优先级告警仅通过邮件发送。
