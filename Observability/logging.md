# 9.3.2 日志的存储与索引

处理日志本来是件稀松平常的事情，但数据规模的影响下，量变引发质变，日志处理成为典型的大数据场景之一：高吞吐写入（GB/s）、低成本海量存储（PB 级别）、亿级数据量实时检索（1s 内）。

本节，笔者将从日志存储与分析的角度，介绍三种各具特色的日志系统方案：Elastic Stack（全文索引）、Loki（仅索引元数据）和 ClickHouse（列式数据库）。

## 1. 全文索引方案 Elastic Stack

讨论如何实现一套完整的日志系统时，工程师们或多或少都听说过这几个名词：ELK、ELKB 或 Elastic Stack。

实际上，它们指向的是同一套用于日志处理的开源组件。Elastic Stack（为明确统一，本文统称 Elastic Stack）是由 Elastic 公司开发的一组开源工具，专门用于数据海量的收集、搜索、分析和可视化处理。

图 9-6 展示了一套基于 Elastic Stack 的日志处理方案：

- **数据收集**：Beats 组件部署在日志生成节点，负责收集原始数据。
- **数据缓冲**：使用消息队列（RabbitMQ）缓冲数据，以提高数据吞吐量。
- **数据清洗**：数据发送到 Logstash 清洗。
- **数据存储**：清洗后的数据存储在 Elasticsearch 集群，并生成索引。
- **数据可视化**：Kibana 负责数据检索、分析、可视化处理。如果需要，还可以再部署一套 Nginx 实现访问控制。

:::center
  ![](../assets/ELK.png)<br/>
  图 9-6 整合了消息队列和 Nginx 的 Elastic 日志系统
:::

:::tip 额外知识
Elastic 公司的发展始于创始人 Shay Banon 的个人兴趣，从开源、聚人、成立公司，到走向纽交所，再到股价一路狂飙（截止 2024 年 7 月 11 日，最新市值 $107 亿），几乎是最理想的工程师创业故事。
:::

Elastic Stack 套件中，最核心的组件是 Elasticsearch —— 一个基于 Apache Lucene 构建的开源的搜索与分析引擎。值得一提的是，Lucene 的作者就是大名鼎鼎的 Doug Cutting，如果你不知道他是谁是？那你一定听过他儿子玩具的名字 —— Hadoop。

Elasticsearch 能够在海量数据中快速检索关键词，其关键技术之一是 Lucene 中的“反向索引”（Inverted Index）。与反向索引相对的是正向索引，两者的区别是：

- **正向索引（Forward Index）**：正向索引是一种传统的索引方法，它将文档集合中的每个单词作为键，将包含该单词的文档列表作为值。正向索引适用于快速检索特定标识符的文档，常用于数据库管理系统中的主键索引。
- **反向索引（Inverted Index）**：反向索引通常被译为“倒排索引”，但“倒排”容易让人误以为与排序有关，实际上它与排序无关。反向索引的工作原理是将文本分割成词条，并构建“<词条->文档编号>”的索引，以便快速定位某个词出现在哪些文档中。

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
检索时，条件“what”, “is” 和 “it” 将对应这个集合：$\{0, 1\}\cap\{0,1,2\}\cap\{0,1,2\} = \{0,1\}$。可以看出，反向索引使得搜索操作能够快速定位包含特定关键词的文档，而无需逐一扫描所有文档。

Elasticsearch 另一项关键技术是“分片”（sharding），每个分片相当于一个独立的 Lucene 实例，类似于一个完整的数据库。

- 文档写入时，Elasticsearch 通过哈希函数（通常基于文档 ID）计算该文档应存储的分片，从而将文档有序地分配到不同的分片中。
- 查询文档时，查询请求并行地在多个分片上执行计算，最终将结果聚合后返回给客户端，这显著提升了查询的吞吐量。

追求极致查询性能的背后，Elasticsearch 也付出了相应的代价：

- **写入吞吐量下降**：文档写入过程中需要进行分词和构建排序表等 CPU 和内存密集型操作，导致写入性能下降。
- **存储空间占用高**：Elasticsearch 存储原始数据和反向索引，为了加速分析，可能还需要额外存储一份列式数据。
- **冗余副本**：为避免分片的单点故障，Elasticsearch 默认为每个分片提供一个冗余副本。


## 2. 轻量化处理方案 Loki 

Grafana Loki（简称 Loki）是由 Grafana Labs 开发的一款日志聚合系统。其设计灵感来源于 Prometheus，旨在成为“日志领域的 Prometheus”，并具有轻量、低成本以及与 Kubernetes 高度集成的特点。

Loki 的主要组件包括 Promtail（日志代理）、Distributor（分发器）、Ingester（写入器）、Querier（查询器）、Query Frontend（查询前端）和 Ruler（规则处理器）。其中，Promtail 负责从各种来源收集日志，Distributor 验证并分发日志，Ingester 负责存储和索引日志，Querier 用于执行日志查询，Query Frontend 优化查询请求，而 Ruler 负责监控和告警规则的执行。

:::center
  ![](../assets/loki_architecture_components.svg)<br/>
  图 9-7 Loki 架构
:::

Loki 最大的特点是仅为日志的元数据（如标签和时间戳）建立索引，而不是对原始日志数据进行全文索引。在 Loki 的存储模型中，主要有两种数据类型：块（Chunks）和索引（Indexes）。

- 索引（Indexes）：索引存储每个日志流的标签集，并将其与相应的块关联。索引的作用是快速定位到特定的日志块，从而提高查询效率。索引通常存储在高读写性能的数据库中，如 Amazon DynamoDB、Google Bigtable 或 Apache Cassandra。
- 块（Chunks）：块是 Loki 存储日志数据的主要方式，包含实际的日志内容。当日志条目到达 Loki 时，它们会被压缩并存储为块，保存在对象存储（如 Amazon S3 或 Google Cloud Storage）或本地文件系统中。

在用户发起日志查询时，查询请求首先根据“时间范围”和“标签”在索引中查找对应的块。然后，Loki 根据索引返回的块元数据，从块存储中读取并解压缩实际的日志数据，最终将日志返回给用户。

通过仅索引元数据以及分离存储索引和块的设计，Loki 在处理大规模日志数据时具有明显的成本优势。


## 3. 列式存储数据库 ClickHouse

近几年，在日志处理场景，ClickHouse 频繁出现。

ClickHouse 是一个用于 OLAP（On-Line Analytical Processing，在线分析处理）的列式列式数据库管理系统，由俄罗斯 Yandex [^1]公司的工程师在 2008 年开发，并于 2016 年 6 月 开源。 

ClickHouse 的关键特点是：列式存储、向量化查询执行、高效压缩、实时数据处理、水平扩展、复杂查询（支持 SQL 语法）...。这些特点使 ClickHouse 能够在海量数据（数十亿级别）的规模下，实现基于 SQL 语法查询的秒级响应，因此成为大规模数据分析、实时流式数据查询以及业务数据分析的理想选择。

一个流行的观点认为：“提升查询速度的最简单有效方法是减少数据扫描范围和数据传输量”。减少数据扫描范围和数据传输量的核心，在于数据是如何被组织和存储的。

先来看传统的行式数据库系统中，数据是如何存储的。如下所示，MySQL、Postgres 这类的数据库按如下方式组织数据。

<center >表 9-2 行式数据库存储结构</center>

|Row | ProductId |sales  |Title| GoodEvent |CreateTime|
|:--|:--|:--|:--|:--|:--|
| #0 | 89354350662 |120 |Investor Relations|  1 |2016-05-18 05:19:20|
| #1 |  90329509958 | 10|  Contact us |  1 | 2016-05-18 08:10:20| 
| #2 |  89953706054 | 78 | Mission|  1 | 2016-05-18 07:38:00| | 
| #N |  ...|  ...|  ...|  ... | ...


行式数据库一张表中的一行内的所有数据在物理介质内是彼此相邻存储的。如果要执行下面的 SQL（统计某个产品的销售额）：

```SQL
SELECT sum(sales) AS count FROM 表 WHERE  ProductId=90329509958
```

上述分析类的查询，实际上只需要读取表的一小部分列（sales 列）。

但行式数据库需要将所有行从磁盘加载到内存中，进行扫描和过滤（检查是否符合 where 条件），过滤出目标行之后，再判断是否有聚合函数（如 SUM、MAX、MIN），如有则执行相应的计算和排序，再过滤不需要的列，最终输出结果。整个流程可能需要非常长的时间。


接着看列式数据库系统是如何规避上面的问题。首先，列式数据库按如下方式组织数据。

<center >表 9-3 列式数据库存储结构</center>

|Row:| #0 | #1 | #2 | #N|
|:--|:--|:--|:--|:--|
|ProductId:| 89354350662 |90329509958 |89953706054 |...|
|sales: |120 |22| 12 |...|
|Title: | Investor  Relations | Contact us | Mission |...|
|GoodEvent: | 1| 1| 1| ...|
|CreateTime: | 2016-05-18 05:19:20 |2016-05-18 08:10:20 |2016-05-18 07:38:00 |...|

可以看到，列式存储不是讲一行中的所有值存储在一起，而是将每列中的所有值存储在一起。

列式数据库中我们只需读取的数据。如上面统计销售额示例的 SQL，只需读取 sales 列，其他与查询无关的列并不会被读取，从而避免了不必要的磁盘 IO 操作。

此外，列式存储和数据压缩通常是伴生的。

数据压缩的本质是通过一定的步长对数据进行匹配扫描，发现重复部分后进行编码转换。因此，数据中重复项越多，压缩率越高。面向列式的存储，同一列字段的数据具有相同的数据类型和语义，重复项的可能性自然更高。ClickHouse 支持不同的列配置不同的压缩算法。这样，用户可以根据每列的数据特性选择最合适的压缩方式。

如下所示，创建一个 MergeTree 类型的 example 表。对 UInt64 列使用了 LZ4 算法（适合快速读取的大量数值数据），对 name 列使用 ZSTD 算法（适合较大的字符串），对 createTime 列使用了 Double-Delta（适合递增或相邻值差异较小的数据）等。

```SQL
CREATE TABLE example (
    id UInt64 CODEC(ZSTD), -- 为整数列设置 LZ4 压缩
    name String CODEC(LZ4), -- 为字符串列设置 ZSTD 压缩
    age UInt8 CODEC(NONE),  -- 不压缩
    score Float32 CODEC(Gorilla) -- 为浮点数设置 Gorilla 压缩
    createTime DateTime CODEC(Delta, ZSTD), --  为时间戳设置 Delta 编码加 ZSTD 压缩
) ENGINE = MergeTree()
ORDER BY id;
```

近几年来，经常在国内各个技术公众号看到 ClickHouse 降低存储成本的实践分享。在 B 站的技术文章《B 站基于 Clickhouse 的下一代日志体系建设实践》中，我们看到相较于 Elasticsearch ，B 站使用 ClickHouse 后降低了 60%+ 的存储成本[^2]。

:::center
  ![](../assets/es-vs-clickhouse.png)<br/>
  图 9-8 同一份日志在 Elasticsearch、ClickHouse 和 ClickHouse(zstd) 中的容量对比（结果越低越好）
:::

ClickHouse 支持“分片”（Sharding）技术，也就是支持分布式并行计算。节点规模的上限即是 Clickhouse 处理能力的上限，只要有足够多的硬件资源，Clickhouse 能实现处理数百亿到数万亿条记录、数 PB 级别的数据。

根据 Yandex 的内部跑分结果来看（图 9-9），一亿条记录的规模上，ClickHouse 比 Vertia（一款商业的 OLAP 分析软件）快约 5 倍、比 Hive 快 279 倍、比 InifniDB 快 31 倍。ClickHouse 表现的惊人的查询性能，当之无愧阐述 ClickHouse 介绍中“实时”（real-time）二字含义。

:::center
  ![](../assets/ClickHouse-benchmark.jpeg)<br/>
  图 9-9 ClickHouse 性能测试 [图片来源](http://clickhouse.yandex/benchmark.html)
:::

正如 ClickHouse 的宣传所言，其他的开源系统太慢，商用的又太贵。只有 ClickHouse 在存储成本与查询性能之间做到了良好平衡，不仅快且还开源。

[^1]: 以运营俄罗斯最受欢迎的搜索引擎闻名，被称为俄罗斯的 Google
[^2]: 参见 https://mp.weixin.qq.com/s/dUs7WUKUDOf9lLG6tzdk0g