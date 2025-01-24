# 9.3.2 日志的索引与存储

处理日志本来是件稀松平常的事情，但随着数据规模的增长，量变引发质变，高吞吐写入（GB/s）、低成本海量存储（PB 级别）以及亿级数据的实时检索（1 秒内），已成为软件工程领域最具挑战性的难题之一。


本节将从日志存储与分析的角度出发，介绍业内三种主流的日志处理解决方案。

## 1. 全文索引方案 Elastic Stack

在讨论如何实现完整的日志系统时，ELK、ELKB 或 Elastic Stack 是工程师们耳熟能详的名词。它们实际上指代同一套由 Elastic 公司[^1]开发的开源工具，用于海量数据的收集、搜索、分析和可视化处理。

图 9-6 展示了一套基于 Elastic Stack 的日志处理方案：

- **数据收集**：Beats 组件部署在业务所在节点，负责收集原始的日志数据。
- **数据缓冲**：使用 RabbitMQ 消息队列缓冲数据，提高数据吞吐量。
- **数据清洗**：数据通过 Logstash 进行清洗。
- **数据存储**：清洗后的数据存储在 Elasticsearch 集群中，它负责索引日志数据、查询聚合等核心功能。
- **数据可视化**：Kibana 负责数据检索、分析与可视化，必要时可部署 Nginx 实现访问控制。

:::center
  ![](../assets/ELK.png)<br/>
  图 9-6 整合了消息队列、Nginx 的 Elastic Stack 日志系统
:::

Elastic Stack 中最核心的组件是 Elasticsearch —— 基于 Apache Lucene 构建的开源的搜索与分析引擎。值得一提的是，Lucene 的作者就是大名鼎鼎的 Doug Cutting，如果你不知道他是谁是？那你一定听过他儿子玩具的名字 —— Hadoop。

Elasticsearch 能够在海量数据中迅速检索关键词，其关键技术之一就是 Lucene 提供的“反向索引”（Inverted Index）。与反向索引相对的是正向索引，二者的区别如下：

- **正向索引**（Forward Index）：传统的索引方法，将文档集合中的每个单词作为键，值为包含该单词的文档列表。正向索引适用于快速检索特定标识符的文档，常见于数据库中的主键索引。
- **反向索引**（Inverted Index）：反向索引通过将文本分割成词条并构建“<词条->文档编号>”的映射，快速定位某个词出现在什么文档中。值得注意的是，反向索引常被译为“倒排索引”，但“倒排”容易让人误以为与排序有关，实际上它与排序无关。

举一个具体的例子，以下是三个待索引的英文句子：

- T~0~ = "it is what it is"
- T~1~ = "what is it"
- T~2~ = "it is a banana"

通过反向索引，可以得到以下匹配关系：

```
"a":      {2}
"banana": {2}
"is":     {0, 1, 2}
"it":     {0, 1, 2}
"what":   {0, 1}
```
在检索时，条件“what”、“is” 和 “it” 将对应集合：$\{0, 1\}\cap\{0,1,2\}\cap\{0,1,2\} = \{0,1\}$。可以看出，**反向索引能够快速定位包含特定关键词的文档，而无需逐个扫描所有文档**。

Elasticsearch 的另一项关键技术是“分片”（sharding）。每个分片相当于一个独立的 Lucene 实例，类似于一个完整的数据库。在文档写入时，Elasticsearch 会根据哈希函数（通常基于文档 ID）计算出文档所属的分片，从而将文档均匀分配到不同的分片；查询时，Elasticsearch 会并行地在多个分片上执行计算，并将结果聚合后返回给客户端，从而提高查询吞吐量。

为了追求极致的查询性能，Elasticsearch 也付出了以下代价：
- **写入吞吐量下降**：文档写入需要进行分词和构建排序表等操作，这些都是 CPU 和内存密集型的，会导致写入性能下降。
- **存储空间占用高**：Elasticsearch 不仅存储原始数据和反向索引，为了加速分析能力，可能还额外存储一份列式数据（Column-oriented Data）；其次，为了避免单点故障，Elasticsearch 会为每个分片创建一个或多个副本副本（Replica），这导致 Elasticsearch 会占用极大的存储空间。


## 2. 轻量化处理方案 Loki 

Grafana Loki 是由 Grafana Labs 开发的一款日志聚合系统，其设计灵感来源于 Prometheus，目标是成为“日志领域的 Prometheus”。与 Elastic Stack 相比，Loki 具有轻量、低成本和与 Kubernetes 高度集成等特点。

Loki 的架构如图 9-7所示，主要组件有 Promtail（日志代理）、Distributor（分发器）、Ingester（写入器）、Querier（查询器）、Query Frontend（查询前端）和 Ruler（规则处理器）。其中，Promtail 负责从多种来源收集日志；Distributor 验证并分发日志；Ingester 负责存储和索引日志；Querier 执行日志查询；Query Frontend 优化查询请求；Ruler 处理监控和告警规则的执行。

:::center
  ![](../assets/loki_architecture_components.svg)<br/>
  图 9-7 Loki 架构
:::

Loki 的主要特点是，只对日志的元数据（如标签、时间戳）建立索引，而不对原始日志数据进行索引。在 Loki 的存储模型中，数据有以下两种类型：

- **索引**（Indexes）：Loki 的索引仅包含日志流的标签（如日志的来源、应用名、主机名等）和时间戳，并将其与相应的块关联。
- **块**（Chunks）：块是 Loki 用来存储实际日志数据的基本单元。每个日志条目都会被压缩成一个块，并存储在持久化存储介质中，如对象存储（例如 Amazon S3、GCP、MinIO）或本地文件系统。

当用户发起日志查询时，Loki 根据时间范围和标签等查询条件，首先在索引中查找与条件匹配的块。然后，Loki 使用这些索引信息找到对应的日志块，从块存储中读取日志数据，并将其解压缩后返回给用户。

不难看出，Loki 通过仅索引元数据、以及索引和块的分离存储设计，让其在处理大规模日志数据时具有明显的成本优势。

## 3. 列式存储数据库 ClickHouse

近几年，在日志处理场景，ClickHouse 一词频繁出现。

ClickHouse 是一个用于 OLAP（On-Line Analytical Processing，在线分析处理）的列式数据库管理系统，由俄罗斯 Yandex [^1]公司在 2008 年开发，并于 2016 年 6 月 开源。 

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

可以看到，列式存储不是将一行中的所有值存储在一起，而是将每列中的所有值存储在一起。

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

ClickHouse 支持“分片”（Sharding）技术，也就是支持分布式并行计算。节点规模的上限即是 Clickhouse 处理能力的上限，只要有足够多的硬件资源，Clickhouse 能实现处理数百亿到数万亿条记录、数 PB 级别的数据。

根据 Yandex 的内部跑分结果来看（图 9-9），一亿条记录的规模上，ClickHouse 比 Vertia（一款商业的 OLAP 分析软件）快约 5 倍、比 Hive 快 279 倍、比 InifniDB 快 31 倍。正如 ClickHouse 的宣传所言，其他的开源系统太慢，商用的又太贵。只有 ClickHouse 在存储成本与查询性能之间做到了良好平衡，不仅快且还开源。

:::center
  ![](../assets/ClickHouse-benchmark.jpeg)<br/>
  图 9-9 ClickHouse 性能测试 [图片来源](http://clickhouse.yandex/benchmark.html)
:::

[^1]: Elastic 公司的发展始于创始人 Shay Banon 的个人兴趣，从开源、聚人、成立公司，到走向纽交所，再到股价一路狂飙（截止 2024 年 7 月 11 日，最新市值 $107 亿），几乎是最理想的工程师创业故事。
[^1]: 以运营俄罗斯最受欢迎的搜索引擎闻名，被称为俄罗斯的 Google
[^2]: 参见 https://mp.weixin.qq.com/s/dUs7WUKUDOf9lLG6tzdk0g