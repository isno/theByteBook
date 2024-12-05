# 6.5 小结

做架构设计最难的是“如何支撑海量请求”，解决这一挑战的核心在于分布式系统。分布式系统的关键问题是：如何在节点可能故障的情况下，确保对某个操作达成一致。

尽管 Paxos 是几十年前提出的算法，但它开创了分布式共识的研究。Paxos 通过多数派投票机制和两阶段协议（Prepare 和 Accept）明确了对单个值达成共识。解决了单值一致性问题后，执行多次 Paxos 算法即可实现一系列值的共识，这便是 Multi-Paxos 的核心思想。基于 Multi-Paxos 思想，将整个共识过程分解为几个子问题：领导者选举、日志复制和安全性，这就是易理解、易论证、易实现的 Raft 算法。


在充满不确定性的世界中建立秩序，保证了系统的可靠性和一致性，这才有了区块链（以太坊、比特币）、分布式系统、云计算等大放异彩的故事。



参考文档：
- https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying
- raft 动画，https://raft.github.io/raftscope/index.html
- 《In Search of an Understandable Consensus Algorithm》，https://raft.github.io/raft.pdf
- 《Raft 分布式系统一致性协议探讨》，https://zhuanlan.zhihu.com/p/510220698
- 《Implementing Replicated Logs
with Paxos》，https://ongardie.net/static/raft/userstudy/paxos.pdf