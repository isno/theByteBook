# 6.5 小结

Paxos 论文的意义在于它首次定义了分布式系统中的一致性问题，并提供了一种可验证的数学模型。

Paxos 开创了分布式共识研究的先河，不仅成为许多分布式系统课程和教材中的经典内容，而且它的思想和技术也广泛应用于许多工业系统中。例如，Google 的 Chubby 锁服务、Amazon 的 Dynamo 系统、Apache Kafka 和 Zookeeper 等，都采纳了 Paxos 或其衍生算法来实现分布式一致性和容错机制。毫无疑问，Paxos 算法是分布式系统领域最具影响力的算法之一。不夸张地说，如果没有 Paxos 算法的先驱性工作，区块链、分布式系统、云计算等领域的发展可能会推迟数年甚至十几年。


参考文档：
- https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying
- raft 动画，https://raft.github.io/raftscope/index.html
- 《In Search of an Understandable Consensus Algorithm》，https://raft.github.io/raft.pdf
- 《Raft 分布式系统一致性协议探讨》，https://zhuanlan.zhihu.com/p/510220698
- 《Implementing Replicated Logs
with Paxos》，https://ongardie.net/static/raft/userstudy/paxos.pdf