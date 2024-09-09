# 9.3.1 指标数据的收集与处理

指标（Metrics）是监控的代名词。与日志不同，日志是对应用程序操作的一种记录，而监控更多是通过对指标数据的聚合，来对应用程序在特定时间内行为的衡量。


提到监控系统，避不开 Prometheus，Prometheus 已经成为云原生中指标监控的事实标准。
:::tip 额外知识
Google 的 Borg 系统孕育出了 Kubernetes，Prometheus 的前身 —— Google 内部配套的监控系统 Brogmon 则由前 Google工程师在 Soundcloud 以开源软件的形式继承下来。
:::

如图 9-4 所示的 Prometheus 架构，它通过不同的子功能实现指标采集、存储、计算和展示等，再通过搭积木组合出一个以应用为中心，功能强大的监控告警系统。Prometheus 中核心组件的说明如下：

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


广义上讲，所有可以向 Prometheus 提供监控样本数据的程序都可以被称为一个 Exporter，Exporter 的一个实例被称为 target，Prometheus 会通过轮询的形式定期从这些 target 中获取样本数据。

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


回顾指标数据有什么特征？

```json
  {
    "metric": "http_requests_total",  // 指标名称，表示 HTTP 请求的总数
    "labels": {                       // 标签，用于描述该指标的不同维度
      "method": "GET",                // HTTP 请求方法
      "handler": "/api/v1/users",     // 请求的处理端点
      "status": "200"                 // HTTP 响应状态码
    },
    "value": 1458                     // 该维度下的请求数量
  },
```

纯数字、具有时间属性，它们肯定也有关系嵌套、不用考虑主键/外键、不用考虑事务处理。对于这类基于时间，揭示其趋势性、规律性的数据，业界也发展出了专门优化的数据库类型 —— 时序数据库（Time-Series Database）。

时序数据库其实并不是一个新鲜的概念，追溯其历史，1999 年问世的 RRDtool 应该是最早的专用时序数据库。2015 年起，时序数据库逐步开始流行。现在，在排行网站 DB-engines 上面，时序数据库已成为流行度最高的数据库。与常规的关系数据库SQL相比，最大的区别在于，时序数据库是以时间为索引的规律性时间间隔记录的数据库。

- 时序数据库使用 LSM-Tree 来代替常规数据库中的 B+Tree。所有的写入操作，写入内存存储区（MemTable，通常是跳表或平衡树）。当 MemTable 满时，数据被批量写入磁盘文件中，虽然写磁盘文件延迟较高，但磁盘写入操作是批量进行的。


如图所示为一个时序数据库的显示形式，其索引为timestamp，后面不同的列记录了在当前时间戳下的属性值。随着时间增长，这种记录会周期性地增加。

:::center
  ![](../assets/tsdb.svg)<br/>
  图 9-7 时序数据库结构
:::

其中 metric 表示为度量，也就是关系型数据库中的 table。data point 是数据点，也就是关系型数据库的 row，timestamp 为产生数据点的时间。而 field 是度量下会随着时间戳变化的属性值，tags 是附加信息，一般是跟时间戳关系不大的属性信息。


:::tip 时序数据库
时序数据库具备秒级写入百万级时序数据的性能，提供高压缩比低成本存储、预降采样、插值、多维聚合计算、可视化查询结果等功能，解决由设备采集点数量巨大、数据采集频率高造成的存储成本高、写入和查询分析效率低的问题。
:::





默认情况下，Prometheus 将数据存储在本地 TSDB 中，并设定了默认的存储时限（15天），这种设计的理念基于“指标数据通常反映短期内的系统行为假设，而非长期/可靠分布式存储”。

Prometheus 也考虑了长期存储的场景，你可以通过它的远端存储扩展（Remote Read/Write API）将数据存储到任意第三方存储上。目前，社区已经涌现出大量适用于长期时序数据存储的解决方案，如 Thanos、VictoriaMetrics、SignalFx、InfluxDB 和 Graphite 等。这些时序数据库一般具有更高的可用性、可扩展能力，笔者就不再一一介绍了。

## 4. 展示分析/预警

采集/存储指标最终目的要用起来，也就是要“展示分析”以及“预警”。

在可观测数据展示方面，Grafana Dashboard 基本已经成为事实的标准。Grafana 的 slogan 是“Dashboard anything. Observe everything.”。Prometheus 提供了名为 PromQL（Prometheus Query Language）的数据查询语言，这是一套完全由 Prometheus 定制的数据查询 DSL，能对时序数据进行高效地过滤、聚合和计算，已被广泛用在数据查询、可视化、报警处理等日常使用中。

Grafana 对 PromQL 提供了全面支持，两者的结合意味着“只要你能想到的数据，都能转化为你想要的图表”。

:::center
  ![](../assets/grafana-dashboard-english.png)<br/>
  图 9-7 通过 PromQL 查询指标数据，Grafana 展示指标数据
:::

在预警方面，Prometheus 负责数据的采集和预警信息的生成，而预警信息的进一步处理则由 Alertmanager 组件专门负责。

Prometheus 首先定义预警规则，并定期对这些规则进行评估。一旦检测到预警条件被触发，Prometheus 会向 Alertmanager 发送预警信息。Alertmanager 对这些预警信息进一步的处理，例如去重、降噪、分组等。最后，Alertmanager 通过多种通知渠道，如邮件、微信、或者通用的 WebHook 机制，将处理后的预警信息传达给用户。
