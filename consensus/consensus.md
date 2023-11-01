# 5.1 分布式的核心：共识问题

受翻译影响，网上很多讨论 paxos 或 raft 的内容多使用“分布式一致性协议”或者“分布式一致性算法”这样的描述字眼。例如，Mike Burrows 对 Paxos 的评价原话是 “There is only one consensus protocol...”，很多文章翻译成 “世界上只有一种一致性算法...” 。

虽然在汉语中“共识（consensus）”和“一致（consistency）”是一个意思，但在计算机工程中它们之间还是有明显的区别：consistency 描述的是存储的数据之间不自相矛盾，是数据应该达到的**结果**；而 consensus 则是大家关心的某件事情（比如选举、分布式锁、全局ID、数据复制等等）达成一致的**过程**。paxos、raft、ZAB 等等属于 consensus 的理论/实现，所以使用“共识”来表达更清晰一些，而 CAP 定理中的 C 和数据库 ACID 的 C 才是真正的“一致性” —— consistency 问题。

