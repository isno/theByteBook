# 使用 Prometheus 配合 Grafana 监控集群

无论选择什么架构，底层基于何种方式运行，可观测性始终拥有极高的优先级，在面向云原生的微服务架构，我们所追求的”可观测性“ 应该是什么样的呢？笔者个人的观点应该有以下几个方面：

- 集群和应用状态的可观测性
- 集群和应用的日志
- 应用间流量、调用关系和请求状态的可观测性

简单来说，就是监控、日志、跟踪，而在 Kubernetes 体系下，Prometheus 正是观测监控的成熟方案。

## Prometheus

Prometheus 一款基于时序数据库的开源监控告警系统，诞生自 SoundCloud 公司。

Prometheus 的基本工作原理是通过 HTTP 协议，周期性的抓取被监控组件的状态，因此被监控组件只需要实现符合规范的 HTTP 接口便可以接入，对于默认没有提供 HTTP 接口的组件，比如 Linux、MySQL 等，Prometheus 支持使用 exporter 来收集信息，并代为提供 metrics 接口。


### Prometheus组件架构图

<div  align="center">
	<img src="/assets/chapter4/prometheus.png" width = "550"  align=center />
</div>

Prometheus 直接从jobs接收或者通过中间的 Pushgateway 网关被动获取指标数据，在本地存储所有获取的指标数据，并对这些数据进行一些规则整理，用来生成一些聚合数据或者报警信息，然后可以通过 Grafana 或者其他工具来可视化这些数据。

其工作流程大致如下：

- Prometheus 服务器定期从配置好的 jobs 或者 exporters 中获取度量数据；或者接收来自推送网关发送过来的度量数据。
- Prometheus 服务器在本地存储收集到的度量数据，并对这些数据进行聚合；
- 运行已定义好的 alert.rules，记录新的时间序列或者向告警管理器推送警报。
- 告警管理器根据配置文件，对接收到的警报进行处理，并通过email等途径发出告警。
- Grafana等图形工具获取到监控数据，并以图形化的方式进行展示。


### Prometheus监控粒度

Prometheus作为监控系统主要在以下各层面实现监控：

- 基础设施层：监控各个主机服务器资源，如CPU,内存,网络吞吐和带宽占用,磁盘I/O和磁盘使用等指标。
- 中间件层：监控独立部署于Kubernetes集群之外的中间件，例如：MySQL、Redis、RabbitMQ、ElasticSearch、Nginx等。
- Kubernetes集群本身的关键指标
- 监控部署在Kubernetes集群上的应用


## 部署 Prometheus