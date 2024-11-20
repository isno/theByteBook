# 6.2 日志与复制状态机

如果要统计分布式系统有多少块基石，“日志”一定是其中之一。


这里的“日志“，并不是工程师熟悉的，通过 log4j 或者 syslog 输出的描述发生事情的文本。它们是只能追加、完全有序的记录序列，

。日志使用二进制格式，仅能由其他程序读取。在 MongoDB 中称 Oplog（Operations Log），在 MySQL 中称 binlog（Binary Log），在 Redis 中称 AOF（Append Only File），在 PostgreSQL 中称 WAL（Write-Ahead Log）。


图 展示了日志结构。每一条记录代表一条指令，每一条记录都指定了一个唯一的顺序的日志记录编号。在日志的末尾添加记录，读取日志记录则从左到右。
:::center
  ![](../assets/log.png) <br/>
  日志记录了什么时候发生了什么 [图片来源^1]
:::


:::tip 状态机复制的基本原理
如果两个相同的 (identical)、确定 (deterministic) 的进程以相同的状态启动，按相同的顺序获取相同的输入，它们将最终达到相同的状态。

多个这样的进程，就组成了我们熟知的各种分布式系统。
:::


分布式系统服务本质上就是关于状态的变更，这里可以理解为状态机，两个独立的进程(不依赖于外部环境，例如系统时钟、外部接口等)给定一致的输入将会产生一致的输出并最终保持一致的状态，而日志由于其固有的顺序性并不依赖系统时钟，正好可以用来解决变更有序性的问题

因此，即使集群发生了故障，只要有一个存活的节点。就可以通过复制器状态来恢复其他节点，从而保证整个系统状态的一致性。



有序的日志，可以不用依赖于系统时钟，解决分布式系统中的多个节点同时处理请求，确定事件的先后顺序问题。


日志是

对分布式系统，通常有两种方式来处理复制和数据处理：

- State machine model（active - active）：在日志记录这样的一些操作，如“+1”、“-2”等，这样，每个复制节点需要执行这些操作，以保证最后的数据状态是一致的。
- Primary-back model (active - passive)：一个单独的master节点，执行“+1”、“-2”等操作，并且在日志中记录操作的结果，如“1”、“3”、“6”等。
:::center
  ![](../assets/active_and_passive_arch.png) <br/>
  日志记录了何时发生了什么
:::




[^1]: https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying 