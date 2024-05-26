# 9.2.1 聚合度量

我们思考譬如接口的请求数、请求的延迟、节点的负载以及内存占用等类似的数据有什么特点呢？可量化（都是纯数字的）、具有时间属性且可聚合。对这些数据进行收集聚合，再聚合之后的指标数据进行度量，从而形成分析或者预警系统，譬如在某个窗口事件内，对接口的状态码的度量指标超过风险阈值，触发 Alert 事件。

对度量的数据进行一些列的收集、分析、处理，实际就是监控系统所做的事情。伴随着 Kubernetes 成为容器编排的事实标准，与之师出同门的 Prometheus，同样**以应用为中心为理念**、诸多强大的特性以及生态的开放性，也俨然成为监控领域的事实标准。 

:::tip 额外知识

Google 的 Borg 系统孕育出了 Kubernetes，而 Prometheus 的前身，Google 内部的监控系统 Brogmon 则由前 Google工程师在 Soundcloud 以开源软件的形式继承下来。

:::

如下图所示，Prometheus 的架构设计中，通过不同的子功能实现埋点采集，爬取和传输，存储，计算，展示等。再通过搭积木的方式，形成一个功能强大的监控告警系统。

<div  align="center">
	<img src="../assets/prometheus-arch.png" width = "500"  align=center />
</div>

分析对 metrics 的处理以及总结 Prometheus 的架构，其实所有监控系统总体上要解决的问题其实就 3 个：

- 监控指标用什么形式表示
- 怎么收集和存储指标
- 怎么利用指标生成报表

## 数据模型

典型的度量指标由以下几个部分组成：

- 指标（metric）：包含指标名（metric name）和描述当前样本特征的标签（labelsets）。
- 时间戳（timestamp)：一个精确到毫秒的时间戳。
- 样本值（value）： 一个 float64 的浮点型数据，表示当前样本的值。

```
  ^
  │   . . . . . . . . . . . . . . . . .   . .   node_cpu{cpu="cpu0",mode="idle"}
  │     . . . . . . . . . . . . . . . . . . .   node_cpu{cpu="cpu0",mode="system"}
  │     . . . . . . . . . .   . . . . . . . .   node_load1{}
  │     . . . . . . . . . . . . . . . .   . .  
  v
    <------------------ 时间 ---------------->
```


Prometheus 的数据模型，简而言之就是一个[时序]的 Metric 数据

指标由 指标名 + 标签（label） 组成，一个指标可以包含多个 label。

```
<--metric name -->{<label name>=<label value>, ...}
prometheus_http_requests_total{status="200", method="GET"}
```

指标的名称(metric name)可以反映被监控样本的含义（比如，http_request_total - 表示当前系统接收到的HTTP请求总量）

标签(label)反映了当前样本的特征维度，通过这些维度Prometheus可以对样本数据进行过滤，聚合等。


这样，对于任何业务，我们都可以将监控数据设计成统一的 Metric 格式，而对于 Prometheus 来说，这种格式足够简单，同时又能应对千变万化的业务场景。

以 Prometheus 为例，它支持四种不同的指标类型：

- Counter（计数器）: Counter 类型的指标其工作方式和计数器一样，初始为 0，只增不减（除非系统发生重置）。常见的监控指标，如 http_requests_total，node_cpu 都是 Counter 类型的监控指标。
- Gauge（仪表盘）：与 Counter 不同，Gauge 类型的指标侧重于反应系统的当前状态。因此这类指标的样本数据可增可减。常见指标如：node_memory_MemFree（主机当前空闲的内容大小）、node_memory_MemAvailable（可用内存大小）都是Gauge类型的监控指标。
- Histogram（直方图）：观测采样统计分类数据，观测数据放入有数值上界的桶中，并记录各桶中数据的个数。典型的应用有延时在 `0~50ms` 的请求数，500ms 以上慢查询数，大 Key 数等。
- Summary（摘要）：聚合统计的多变量，跟 Histogram 有点像，但更有聚合总数的概念。典型应用有成功率、总体时延、总带宽量等。

## 收集指标

不同监控系统收集 Metrics 数据手段各有不同，但总结无非是通过 push 到中心 Collector 方式采集（譬如各种 Agent 采集器，Telegraf 等），又或者是中心 Collector 通过 pull 的方式主动获取。

如下图所示，Prometheus 主动地从数据源拉取数据 Exporter（Exporter 实例称 target ）暴露的 HTTP 服务地址（通常是/metrics）拉取监控样本数据。

<div  align="center">
	<img src="../assets/prometheus-exporter.png" width = "600"  align=center />
</div>

:::tip Exporter
Exporter 一个相对开放的概念，可以是一个独立运行的程序独立于监控目标以外，也可以是直接内置在监控目标中，只要能够向 Prometheus 提供标准格式的监控样本数据即可。
:::

Prometheus 相比 zabbix 这类只监控机器的传统监控系统，最大的特点是对 metrics 全方位的覆盖：

- **宿主机监控数据**：Node Exporter 以 DaemonSet 的方式运行在宿主机，收集节点的负载、CPU、内存、磁盘以及网络这样的常规机器的数据。
- **Kubernetes 本身的运行情况**：Kubernetes 的 API Server、Kubelet 等组件内部通过暴露 /metrics 接口，向 Prometheus 提供各个 Controller 工作队列、请求 QPS 等 Kubernetes 本身工作的情况。
- **Kubernetes Workload 相关的监控**：kuelet 内置的 cAdvisor 服务把 metrics 信息细化到每一个容器的 CPU、文件系统、内存、网络等资源使用情况。

除了上述监控范围，Prometheus 的社区也涌现出大量各种用途的 Exporter，如表所示，涵盖了从基础设施、中间件以及网络等各个方面，让 Prometheus 的监控范围几乎能涵盖所有用户所关心的目标。

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

## 存储指标

Prometheus的数据是典型的时序数据，prometheus本身会将数据存储在本地磁盘上。要注意的是，本地存储不可复制，无法构建集群，如果本地磁盘或节点出现故障，存储将无法扩展和迁移。

Prometheus 的作者及社区核心开发者都秉承一个理念：Prometheus 只聚焦核心的功能，扩展性的功能留给社区解决。Prometheus 扩展了远端存储扩展（Remote Read/Write API），从而可以将数据存储到任意一个第三方存储上。

到目前，社区也涌现出大量长期存储的方案，如 Thanos、Grafana Cortex/Mimir、VictoriaMetrics、Wavefront、Splunk、Sysdig、SignalFx、InfluxDB、Graphite 等。

<div  align="center">
	<img src="../assets/prometheus-storage.jpeg" width = "100%"  align=center />
	<p>长期存储方案</p>
</div>

基于多维度对上述介绍的 Prometheus 长期存储方案进行横向对比，数据持久化到硬盘的方案里，VictoriaMetrics 是更好的选择，如果是对象存储方案，Thanos 则更受欢迎。

## 生成报表

在仪表可视化领域，如果 Grafana Dashboard 称第二，应该没有敢窜出来称第一的。

Grafana Labs 公司成立之前，Grafana Dashboard 就已经在各个开源社区有不小的名气和用户积累。依靠社区的用户基础，Grafana Labs 也快速地将产品渗透至各个企业，各类大场面也时不时会见到 Grafana 的身影：
- 2016年，在猎鹰9号火箭首次发射期间，Grafana 出现在 SpaceX 控制中心的屏幕上；
- 几周后，微软发布一段宣传视频，展示了他们的水下数据中心，同样出现了 Grafana 的身影[^3]。

Grafana 的 slogan 是“Dashboard anything. Observe everything.” ，Prometheus 定义了功能强大的 promQL，可以满足各种复杂的查询场景。而 Grafana 提供了对 PromQL 的完整支持。两者结合的反应：只要你能想到的数据[^1]就能转成任何你想要的图表[^2]。

<div  align="center">
	<img src="../assets/grafana-dashboard-english.png" width = "550"  align=center />
</div>
