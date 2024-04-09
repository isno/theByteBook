# 9.2.2 事件日志

对于日志的生产和处理，相信程序员们绝对不会陌生，绝大多数程序员生涯是从打印 “hello world” 开始。现在稍微复杂点的系统，对日志的完整处理除了打印，还包含着采集、传输、清洗、存储、分析与检索、告警与智能化响应一系列过程。

其中，日志的处理和分析是典型的大数据处理场景：要高吞吐写入、又要低成本海量存储、还要实时文本检索。本节以这个大数据处理场景为切入点，从索引原理到成本分析角度介绍 Elastic stack（全文索引）、Loki（只索引元数据）、ClickHouse（列式数据库）典型代表。

## 传统解决方案 ELK

讨论实现一套完整的日志系统，工程师们或多或少都应该听说过这几个名词：ELK、ELKB 或者 Elastic Stack。这些其实说得都是同一套实现日志处理方案的开源组件，组件之间作用不用，可以像网络协议一样按分层来理解和归类，如下图所示，形成一个类似 TCP/IP Stack 类似的 ELK Stack（这里的 Stack 肯定不是协议栈，且和协议没有任何关系）。

<div  align="center">
	<img src="../assets/elk-stac.svg" width = "350"  align=center />
	<p>Elastic Stack</p>
</div>

:::tip 额外知识
Elastic 的发展始于 Shay Banon 的个人兴趣，从开源、聚人、成立公司，到走向纽交所，再到股价一路狂飙（最新市值 $107 亿），几乎是最理想的工程师创业故事。
:::

为统一明确，本文把上面的所有名词简称为 Elastic。

如下图所示，一个典型的 Elastic 使用场景，大致系统架构如下（整合了消息队列和 Nginx 的架构）。

<div  align="center">
	<img src="../assets/ELK.png" width = "550"  align=center />
	<p>Elastic 日志系统</p>
</div>

这套方案中，Beats 部署到日志所在地收集原始数据，然后使用 MQ 做缓冲换取更好的吞吐，接着发给 logstash 做数据清洗，最后落地到 Elasticsearch 集群并进行索引，使用时通过 Kibana 来检索和分析，如果有必要挂上 Nginx 做各类访问控制。

Elastic 套件中最核心的是 Elasticsearch，这是一个提供一种准实时搜索服务（生产环境中可以做到上报 10 秒后可搜，不惜成本万亿级日志秒级响应）的分布式搜索分析引擎。

:::tip 额外知识

说起 Elasticsearch 不得不提及背后的 Lucene。Lucene 的作者就是大名鼎鼎的 Doug Cutting，如果你不知道他是谁是？那你一定听过他儿子玩具的名字 -- Hadoop。

Lucene 是一个全文检索引擎。Lucene 本身只是个 Lib 库，离直接使用还有部分集成工作，之后陆续有了 Solr、Nutch 等项目帮助发展，但依然不温不火。2012年，Elasticsearch 诞生后，通过优秀的 Restful API、分布式部署等机制才把 Lucene 的使用推向一个新的高度。

:::

Elasticsearch 在日志场景中的优势在于全文检索能力，快速从海量的数据中检索出关键词匹配的日志，其底层核心技术就是 Lucene 中的反向索引（Inverted index）。

:::tip 反向索引

反向索引（inverted index）常被翻译为倒排索引，但倒排极容易误解为倒序。所以本文笔者将 inverted index 翻译为反向索引。

反向索引是信息检索领域常用的索引技术，将文本分割成一个个词，构建 词 -> 文档编号 的索引，可以快速查找一个词在哪些文档出现。

:::

反向索引为 Elasticsearch 带来快速检索能力的同时，也付出了写入吞出率低和存储占用高的代价：
- 由于数据写入反向索引时需要进行分词、词典排序、构建排序表等 CPU 和内存密集型操作，导致写入吞出率大幅下降。
- 而从存储的成本角度考虑，Elasticsearch 会存储原始数据和反向索引，为了加速分析可能还需要存储一份列存数据，三份的冗余数据在观测场景下导致了极高的存储成本。

如果需求只是把日志集中起来，操作多是近期范围内的查询和一些简单的参数（例如 host、service 等），最多用来告警或者排查问题，那可以看看下面要介绍的 Loki 方案。

## 日志处理新贵 Loki 

Loki 是 Grafana Labs 公司推出的类似于 Prometheus 的日志系统，官方的项目介绍是 like Prometheus，but for logs。

Loki 一个明显的特点是非常经济，它不再根据日志的原始内容建立大量的全文索引，而是借鉴了 Prometheus 核心的思想，使用标签对日志进行特征标记，并只索引与日志相关的元数据标签，而日志内容则以压缩方式存储于对象存储中，不做任何索引，这样的话，能避免大量的内存资源占用，相较于 Elastic 这种全文索引的系统，数据可在十倍量级上降低，加上使用对象存储，最终存储成本可降低数十倍甚至更低。

Loki 对以 Kubernetes 为基座的系统十分友好。如下图所示，promtail（日志收集组件）以 DaemonSet 方式运行在每个节点中，负责收集日志并将其发送给 Loki。日志数据使用和 Prometheus 一样的标签来作为索引，也正是因为这个原因，通过这些标签，既可以查询日志的内容，也可以查询到监控的内容，还能对接到 alertmanager。这两种查询被很好的兼容，节省了分别存储相关日志和监控数据的成本，也减少了查询的切换成本（避免 kibana 和 grafana 来回切换）。

<div  align="center">
	<img src="../assets/loki-arc.png" width = "550"  align=center />
	<p>Loki 架构：与 Prometheus、Grafana 密切集成</p>
</div>

作为 Grafana Labs 的自家产品，Loki 自然与 Grafana 密切集成，如下图所示，使用 Loki 的查询语法 LogQL 使用标签和运算符进行过滤，展示出任何你想要的图表。

<div  align="center">
	<img src="../assets/loki-dashboard.jpeg" width = "550"  align=center />
	<p>Loki Grafana </p>
</div>

总体而言，Loki 和 Elastic 都是优秀的日志解决方案，具体如何选择取决于具体场景。

Loki 相对轻量，具有较高的可扩展性和简化的存储架构，若是数据的处理不那么复杂，且有时序属性，如应用程序日志和基础设施指标，并且应用使用 kubernetes Pod 形式部署，则选择 Loki 比较合适。Elastic 则相对重量，需要复杂的存储架构和较高的硬件要求，部署和管理也比较复杂，适合更大的数据集和更复杂的数据处理需求。

## 凶猛彪悍的 ClickHouse

一个流行的观点认为：如果你想要查询变得更快，最简单且有效的方法就是减少数据扫描范围和数据传输的大小。而列式存储和数据压缩就可以帮助我们实现上述两点。

通常的按行存储的数据库中，数据是按照如下顺序存储的。换句话说，一行内的所有数据都彼此依次存储。像这样的行式数据库包括MySQL、Postgres、MS SQL-Server等。
<div  align="center">
	<img src="../assets/row-database.png" width = "550"  align=center />
	<p>按行存储</p>
</div>

而面向列的数据库管理系统中，数据是这样存储的：

<div  align="center">
	<img src="../assets/column-database.png" width = "550"  align=center />
	<p>列是存储</p>
</div>

压缩的本质是按照**一定步长对数据进行匹配扫描，当发现重复部分的时候就进行编码转换**。数据中的重复项越多，则压缩率越高。 同一列字段的数据，因为拥有相同的数据类型和现实语义，重复项可能性自然更高。下图为同一份日志在 Elasticsearch, ClickHouse 和 ClickHouse(zstd) 中的容量, 最终对比 Elasticsearch 达到了 1:6。[^4]

<div  align="center">
	<img src="../assets/es-vs-clickhouse.png" width = "550"  align=center />
	<p>B站 </p>
</div>


列式数据库的佼佼者当属由 Yandex（一家俄罗斯搜索引擎公司）开源的用于 MPP (Massively Parallel Processing，大规模并行处理)架构的列式存储分析型数据库 ClickHouse。

:::tip 什么是 ClickHouse
ClickHouse® is an open-source **column-oriented** database management system that allows generating analytical data reports in **real-time**.
:::

ClickHouse 的全称是 Click Stream，Data WareHouse，特点是极致的向量化查询性能，功能强大的表引擎、数据类型、索引类型和高效计算函数，灵活的可配置项以及自定义参数。

ClickHouse 极致的查询速度，当之无愧阐述“实时（real-time）”二字含义。从它的跑分结果来看：ClickHouse 比 Vertia（一款商业的 MPP 分析软件）快约5倍，比 Hive 快279倍，比 My SQL 快801倍；虽然对不同的SQL查询，结果不完全一样，但是基本趋势是一致的。

<div  align="center">
	<img src="../assets/ClickHouse-benchmark.jpeg" width = "550"  align=center />
	<p></p>
</div>

正如 ClickHouse 的宣传所言：其他的开源系统太慢、商用太贵，只有 ClickHouse 在成本与性能之间做到了良好平衡，又快还开源。



[^1]: 参见 https://grafana.com/grafana/plugins/data-source-plugins/
[^2]: 参见 https://grafana.com/grafana/dashboards/
[^3]: 参见 https://grafana.com/blog/2023/09/26/celebrating-grafana-10-top-10-oh-my-grafana-dashboard-moments-of-the-decade/
[^4]: 参见 https://mp.weixin.qq.com/s/dUs7WUKUDOf9lLG6tzdk0g
[^5]: 参见 http://clickhouse.yandex/benchmark.html