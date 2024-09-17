# 9.3.2 日志的存储

处理日志本来是件稀松平常的事情，但数据规模的影响下，由量变引发质变，日志处理成为典型的大数据场景之一：高吞吐写入（GB/s）、低成本海量存储（PB 级别）、亿级数据量实时检索（1s 内）。

本节，笔者将从日志存储与分析的角度，介绍三种各具特色的日志系统方案：Elastic Stack（全文索引）、Loki（仅索引元数据）和 ClickHouse（列式数据库）。

## 1. 全文索引方案 Elastic Stack

讨论实现一套完整的日志系统，工程师们或多或少都应该听说过这几个名词：ELK、ELKB 或者 Elastic Stack（为统一明确，后续统称 Elastic Stack），这些其实说得都是同一套实现日志处理方案的开源组件。

Elastic Stack 是由 Elastic 公司开发的一组开源工具，专用于数据收集、搜索、分析和可视化。如图 9-10，展示了一套基于 Elastic Stack 完整的处理日志方案。这套方案中，Beats 组件部署到日志所在地收集原始数据，然后使用 MQ 做缓冲换取更好的吞吐，接着发给 logstash 组件做数据清洗，最后落地到 Elasticsearch 集群并进行索引，使用时通过 Kibana 组件进行可视化、检索和分析，如果有必要挂上 Nginx 做各类访问控制。

:::center
  ![](../assets/ELK.png)<br/>
  图 9-10 整合了消息队列和 Nginx 的 Elastic 日志系统
:::

:::tip 额外知识
Elastic 公司的发展始于创始人 Shay Banon 的个人兴趣，从开源、聚人、成立公司，到走向纽交所，再到股价一路狂飙（截止 2024 年 7 月 11 日，最新市值 $107 亿），几乎是最理想的工程师创业故事。
:::

Elastic 套件中最核心组件是 Elasticsearch，这一个开源的搜索和分析引擎，基于 Apache Lucene 构建。值得一提的是，Lucene 的作者就是大名鼎鼎的 Doug Cutting，如果你不知道他是谁是？那你一定听过他儿子玩具的名字 —— Hadoop。Lucene 是一个全文检索引擎，离直接使用还有部分集成工作，之后陆续有了 Solr、Nutch 等项目帮助发展，但依然不温不火。直到 2012 年，Elasticsearch 诞生后，通过优秀的 Restful API、分布式部署等扩展才把 Lucene 的使用推向新的高度。

Elasticsearch 能快速从海量的数据中检索出关键词匹配的日志。其极致查询的关键之一是 Lucene 中的反向索引（Inverted index）技术。与反向索引相对的是正常索引，两者的区别是：

- 正向索引（Forward Index）：正向索引是传统的索引方法，它的工作原理是将文档集合中的每个单词作为键，将包含该单词的文档列表作为值。正向索引适合于快速检索特定标识符的文档，常见于数据库管理系统中作为主键索引使用。
- 反向索引（inverted index）：常被翻译为倒排索引，但“倒排”容易误解为倒序，反向索引和“排序”没任何关系，其原理将文本分割成一个个词，通过构建“<词->文档编号>”这样的索引，从而快速查找一个词在哪些文档出现。

以下面三段要被索引的英文为例：

- T~0~ = "it is what it is"
- T~1~ = "what is it"
- T~2~ = "it is a banana"

通过反向索引，得到下面的匹配关系。
```
"a":      {2}
"banana": {2}
"is":     {0, 1, 2}
"it":     {0, 1, 2}
"what":   {0, 1}
```
进行检索时，条件“what”, “is” 和 “it” 将对应这个集合：$\{0, 1\}\cap\{0,1,2\}\cap\{0,1,2\} = \{0,1\}$。

在 Elasticsearch 中，反向索引使得搜索操作能够快速定位包含特定关键词的文档，而无需逐一扫描所有文档。

Elasticsearch 另一项关键是分片机制（sharding）。分片定义为，每一条数据（或者每条记录，每行，每个文档）只属特定的分片。每个分片都可以视为一个完整的数据库，在 Elasticsearch 中，分片是独立的 Lucene 实例。当文档写入时，Elasticsearch 会通过哈希函数（通常是基于文档 ID）计算出文档应该存储在哪个分片中，从而将文档有序分配到不同分片。通过分片，查询并行地在多个分片上执行，并行执行结束之后，再将结果聚合后再返回给客户端，这将大地提高了查询吞吐量。

Elasticsearch 极致查询性能的背后，也付出了数据写入吞出率低和存储空间占用高的代价：

- 因为文档写入时需要进行分词、构建排序表等 CPU/内存密集操作，导致写入吞出率大幅下降；
- Elasticsearch 会存储原始数据和反向索引，为了加速分析可能还需要存储一份列式数据；
- 避免了分片单点故障，默认情况下，Elasticsearch 每个分片都有一个冗余的副本。

## 2. 轻量化处理方案 Loki 

Grafana Loki（简称 Loki）是由 Grafana Labs 公司开发的一款日志聚合系统。它受到 Prometheus 的启发，设计理念是“对于日志的 Prometheus”，其特点是轻量、低成本以及与 Kubernetes 高度契合。

Loki 的主要组件包括 Promtail（日志代理）、Distributor（分发器）、Ingester（写入器）、Querier（查询器）、Query Frontend（查询前端） 和 Ruler（规则处理器）。Promtail 负责从各种源收集日志，Distributor 处理和验证接收的日志，Ingester 负责存储和索引日志，Querier 用于查询日志，Query Frontend 处理查询请求，而 Ruler 负责监控和告警。

:::center
  ![](../assets/loki_architecture_components.svg)<br/>
:::


Loki 最大的一个特点是只为日志的元数据（如标签、时间戳）建立索引，而不是对原始日志数据进行全文索引。在 Loki 存储模型设计中，有两种主要类型的数据：块（Chunks）和索引（Indexes）：

- 索引（Indexes）：索引存储了每个日志流的标签集，并将其与各个块关联起来。索引的作用是快速定位到特定的日志块，从而提高查询效率。索引通常存储在支持高读写性能的数据库中，如 Amazon DynamoDB、Google Bigtable 或 Apache Cassandra。
- 块（Chunks）：块是 Loki 存储日志数据的主要方式，它们包含了实际的日志内容。当日志条目到达 Loki 时，它们会被压缩并存储为块，被保存在对象存储（如 Amazon S3 或 Google Cloud Storage）或本地文件系统中。

当用户发起日志查询时，查询请求会首先根据查询条件中的“时间范围”和“标签”在索引中查找对应的 chunk。然后，Loki 会根据索引返回的 chunk 元数据，从 chunk 存储中读取并解压缩实际的日志数据，最终将日志返回给用户。

只索引元数据，以及索引和 chunk 的分离存储模型，使 Loki 在处理大规模日志数据时具有明显的成本优势。

## 3. 列式存储数据库 ClickHouse

近些年，在日志处理场景，ClickHouse 也频繁出现。

ClickHouse 是一个用于 OLAP（On-Line Analytical Processing，在线分析处理）的列式列式数据库管理系统，由俄罗斯 Yandex（以 运营着俄罗斯最受欢迎的搜索引擎闻名，被称为俄罗斯的 Google）公司的工程师在 2008 年开发，并于 2016 年 6 月 开源。 

ClickHouse 的关键特点有列式存储、向量化查询执行、高效压缩、实时数据处理、水平扩展、复杂查询（支持 SQL 语法）。这些特点使 ClickHouse 大规模数据分析、实时流式数据查询以及业务数据分析的理想选择。能够在海量数据（数十亿级别）的规模下，实现基于 SQL 语法的实时查询秒级响应。

一个流行的观点认为：“提升查询速度的最简单有效方法是减少数据扫描范围和数据传输量”。减少数据扫描范围和数据传输量的核心，在于数据是如何被组织和存储的。先来看传统的行式数据库系统中，数据是如何存储的。如下所示，MySQL、Postgres 这类的数据库数据按如下顺序存储。

<center >表 9-13 行式数据库存储结构</center>

|Row | ProductId |sales  |Title| GoodEvent |CreateTime|
|:--|:--|:--|:--|:--|:--|
| #0 | 89354350662 |120 |Investor Relations|  1 |2016-05-18 05:19:20|
| #1 |  90329509958 | 10|  Contact us |  1 | 2016-05-18 08:10:20| 
| #2 |  89953706054 | 78 | Mission|  1 | 2016-05-18 07:38:00| | 
| #N |  ...|  ...|  ...|  ... | ...


行式数据库一张表中的一行内的所有数据在物理介质内是彼此相邻存储的。如果要执行下面的 SQL（统计某个产品的销售额）：

```
SELECT sum(sales) AS count FROM 表 WHERE  ProductId=90329509958
```

上述分析类的查询，实际上只需要读取表的一小部分列（sales 列）。但行式数据库首先需要将所有行从磁盘加载到内存中，然后进行扫描和过滤（检查是否符合 where 条件），过滤出目标行之后，再判断是否有聚合函数（如 SUM、MAX、MIN），如有则执行相应的计算和排序，再过滤不需要的列，最终输出结果。整个流程可能需要非常长的时间。


在列式数据库系统中，数据的存储是按如下方式组织的：

<center >表 9-14 列式数据库存储结构</center>

|Row:| #0 | #1 | #2 | #N|
|:--|:--|:--|:--|:--|
|ProductId:| 89354350662 |90329509958 |89953706054 |...|
|sales: |120 |22| 12 |...|
|Title: | Investor  Relations | Contact us | Mission |...|
|GoodEvent: | 1| 1| 1| ...|
|CreateTime: | 2016-05-18 05:19:20 |2016-05-18 08:10:20 |2016-05-18 07:38:00 |...|

可以看到，列式存储不是讲一行中的所有值存储在一起，而是将每列中的所有值存储在一起。在列式数据库中我们只需读取的数据。例如，上面统计销售额示例的 SQL，只需读取 sales 列，其他与查询无关的列并不会被读取，从而避免了不必要的磁盘 IO 操作。

此外，列式存储和数据压缩通常是伴生的。数据压缩的本质是通过一定的步长对数据进行匹配扫描，发现重复部分后进行编码转换。因此，数据中重复项越多，压缩率越高。面向列式的存储，同一列字段的数据具有相同的数据类型和语义，重复项的可能性自然更高。ClickHouse 支持不同的列配置不同的压缩算法。这样，用户可以根据每列的数据特性选择最合适的压缩方式。

如下所示，创建一个 MergeTree 类型的 example 表。对 UInt64 列使用了 LZ4 算法（适合快速读取的大量数值数据），对 name 列使用 ZSTD 算法（适合较大的字符串），对 createTime 列使用了 Double-Delta（适合递增或相邻值差异较小的数据）等。

```shell
CREATE TABLE example (
    id UInt64 CODEC(ZSTD), -- 为整数列设置 LZ4 压缩
    name String CODEC(LZ4), -- 为字符串列设置 ZSTD 压缩
    age UInt8 CODEC(NONE),  -- 不压缩
    score Float32 CODEC(Gorilla) -- 为浮点数设置 Gorilla 压缩
    createTime DateTime CODEC(Delta, ZSTD), --  为时间戳设置 Delta 编码加 ZSTD 压缩
) ENGINE = MergeTree()
ORDER BY id;
```

近几年来，经常能在国内各个技术公众号看到使用 ClickHouse 降低存储成本的实践分享。在 B 站的技术文章《B 站基于 Clickhouse 的下一代日志体系建设实践》中，我们看到相较于 Elasticsearch ，B 站使用 ClickHouse 后降低了 60%+ 的存储成本[^2]。

:::center
  ![](../assets/es-vs-clickhouse.png)<br/>
  图 9-15 同一份日志在 Elasticsearch、ClickHouse 和 ClickHouse(zstd) 中的容量对比
:::

ClickHouse 支持分片（Sharding），这是实现水平扩展和分布式并行查询的关键特性。通过增加更多的节点，Clickhouse 能实现处理数百亿到数万亿条记录，以及数 PB 级别的数据。

根据 Yandex 的内部跑分结果来看（图 9-16），ClickHouse 比 Vertia（一款商业的 OLAP 分析软件）快约 5 倍、比 Hive 快 279 倍、比 InifniDB 快 31 倍。ClickHouse 表现的惊人的查询性能，当之无愧阐述 ClickHouse 介绍中“实时”（real-time）二字含义。


:::center
  ![](../assets/ClickHouse-benchmark.jpeg)<br/>
  图 9-16 ClickHouse 性能测试 [图片来源](http://clickhouse.yandex/benchmark.html)
:::

正如 ClickHouse 的宣传所言，其他的开源系统太慢，商用的又太贵。只有 ClickHouse 在存储成本与查询性能之间做到了良好平衡，不仅快且还开源。


[^2]: 参见 https://mp.weixin.qq.com/s/dUs7WUKUDOf9lLG6tzdk0g