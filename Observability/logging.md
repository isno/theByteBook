# 9.1.2 日志

你可能不知道 Metrics、Tracing，但你一定了解点 logging。logging 系统中最成熟的部分就是打印日志。尤其是本地日志打印，各式各样层出不穷的 logging Library，同步的异步的、有锁的无锁的、有上下文的无上下文的、高性能的低性能的，花活最多轮子也造的最多。


:::tip ELKB

ELK 是三个开源项目的首字母缩写，这三个项目分别是：Elasticsearch、Logstash 和 Kibana。 Elasticsearch 是一个搜索和分析引擎。 Logstash 是服务器端数据处理管道，能够同时从多个来源采集数据，转换数据，然后将数据发送到诸如 Elasticsearch 等“存储库”中。Kibana 则可以让用户在 Elasticsearch 中使用图形和图表对数据进行可视化。Beats 作为轻量级的数据搬运工，集合了多种单一用途数据采集器，将数据发送给 Logstash 或 ElasticSearch，其可扩展的框架及丰富的预置采集器将使工作事半功倍。
:::


ELK 中最核心的是 Elasticsearch，它是一个分布式搜索分析引擎，提供一种准实时（Near Real Time）搜索服务。与 Elasticsearch 类似的产品还有商业公司 Splunk 和 Apache 开源的 Solr。事实上，Elasticsearch 和 Solr 都使用了著名的 Java 信息检索工具包 Lucene，而且 Solr 还要更纯正一些，Lucene 的作者就是大名鼎鼎的 Doug Cutting，如果你不知道谁 Doug Cutting，那你一定听过他儿子玩具的名字 -- Hadoop，是不是比 MySQL 创始人分别用自己两个女儿的名字命名 MySQL 和 MariaDB 更牛逼？


Elastic Stack 之所以流行的一个原因之一，可能是它的无侵入性。对于遗留系统的日志，它可以做到悄无声息地把处了上面打印日志之外的所有事情，全都给做了。

我们来看一个典型的 Elastic Stack 使用场景，大致系统架构如下（整合了消息队列和 Nginx 的架构）。

<div  align="center">
	<img src="../assets/ELK.png" width = "550"  align=center />
</div>

这个系统中，Beats 部署到日志所在地，用来收集原始数据，然后使用 MQ 做缓冲换取更好的吞吐，接着发给 logstash 做数据清洗，最后落地到 es 集群并进行索引，使用时通过 Kibana 来检索和分析，如果有必要挂上 Nginx 做各类访问控制。

<div  align="center">
	<img src="../assets/logging.png" width = "550"  align=center />
</div>