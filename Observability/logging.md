# 9.3 日志

你可能不知道 Metrics、Tracing，但你一定了解点 logging。logging 系统中最成熟的部分就是打印日志。尤其是本地日志打印，各式各样层出不穷的 logging Library，同步的异步的、有锁的无锁的、有上下文的无上下文的、高性能的低性能的，花活最多轮子也造的最多。


日志最出名的方案莫过于 ELK，不过 2019 年 Grafana Labs 公司推出一个更能打的选手 Loki。但对于日志这种有时效性的数据而言，笔者也一时想也找不到一定要用到 Elasticsearch 的场景。

## 收集

目前官方有自己的 client： Promtail，也支持主流的组件，如 Fluentd、Logstash、Fluent Bit 等。


:::tip ELKB

ELK 是三个开源项目的首字母缩写，这三个项目分别是：Elasticsearch、Logstash 和 Kibana。 Elasticsearch 是一个搜索和分析引擎。 Logstash 是服务器端数据处理管道，能够同时从多个来源采集数据，转换数据，然后将数据发送到诸如 Elasticsearch 等“存储库”中。Kibana 则可以让用户在 Elasticsearch 中使用图形和图表对数据进行可视化。Beats 作为轻量级的数据搬运工，集合了多种单一用途数据采集器，将数据发送给 Logstash 或 ElasticSearch，其可扩展的框架及丰富的预置采集器将使工作事半功倍。
:::


ELK 中最核心的是 Elasticsearch，它是一个分布式搜索分析引擎，提供一种准实时（Near Real Time）搜索服务。与 Elasticsearch 类似的产品还有商业公司 Splunk 和 Apache 开源的 Solr。事实上，Elasticsearch 和 Solr 都使用了著名的 Java 信息检索工具包 Lucene，而且 Solr 还要更纯正一些，Lucene 的作者就是大名鼎鼎的 Doug Cutting，如果你不知道谁 Doug Cutting，那你一定听过他儿子玩具的名字 -- Hadoop，是不是比 MySQL 创始人分别用自己两个女儿的名字命名 MySQL 和 MariaDB 更牛逼？


Elastic Stack 之所以流行的一个原因之一，可能是它的无侵入性。对于遗留系统的日志，它可以做到悄无声息地把处了上面打印日志之外的所有事情，全都给做了。

我们来看一个典型的 Elastic Stack 使用场景，大致系统架构如下（整合了消息队列和 Nginx 的架构）。

<div  align="center">
	<img src="../assets/loki-overview-2.png" width = "550"  align=center />
</div>

这个系统中，Beats 部署到日志所在地，用来收集原始数据，然后使用 MQ 做缓冲换取更好的吞吐，接着发给 logstash 做数据清洗，最后落地到 es 集群并进行索引，使用时通过 Kibana 来检索和分析，如果有必要挂上 Nginx 做各类访问控制。


## 存储与查询

loki 一个明显的特点是非常经济，Loki 不再根据日志内容去建立大量的索引，而是借鉴了 Prometheus 核心的思想，使用标签去对日志进行特征标记，然后归集统计。Loki 只索引与日志相关的元数据标签，而日志内容则以压缩方式存储于对象存储中, 不做任何索引，这样的话，能避免大量的内存资源占用，转向廉价的硬盘存储。相较于 ES 这种全文索引的系统，数据可在十倍量级上降低，加上使用对象存储，最终存储成本可降低数十倍甚至更低。

说白了，Loki 吸引人的地方就在于拥有和 Prometheus 类似机制的时序数据库以及方便拓展的硬盘资源。



数据由标签、时间戳、内容组成

```
{
  "stream": { 
    "label1": "value1",
    "label1": "value2"
  }, # 标签
  "values": [
    ["<timestamp nanoseconds>","log content"], # 时间戳，内容
    ["<timestamp nanoseconds>","log content"]
  ]
}
```




## 日志展示

在仪表可视化领域，如果 Grafana 称第二，应该没有敢称第一。在 Grafana Labs 公司成立之前，Grafana Dashboard 就已经在各个开源社区有不小的名气和用户积累。依靠社区的用户基础，Grafana Labs 也快速地将产品渗透至各个企业，如果你观察仔细，还能在各大新闻联播节目时不时会见到 Grafana 的身影：2016年，在猎鹰9号火箭首次发射期间，Grafana 出现在 SpaceX 控制中心的屏幕上；几周后，微软发布一段宣传视频，展示了他们的水下数据中心，同样出现了 Grafana 的身影[^3]。

Grafana slogan 中的 “Dashboard anything. Observe everything.” 这个anything 和 everything 可不是说说，使用 Grafana 可以非常轻松的将任何数据[^1]转成任何你想要的图表[^2]的展现形式来做到数据监控以及数据统计。

<div  align="center">
	<img src="../assets/grafana-dashboard-english.png" width = "550"  align=center />
</div>

[^1]: 参见 https://grafana.com/grafana/plugins/data-source-plugins/
[^2]: 参见 https://grafana.com/grafana/dashboards/
[^3]: 参见 https://grafana.com/blog/2023/09/26/celebrating-grafana-10-top-10-oh-my-grafana-dashboard-moments-of-the-decade/