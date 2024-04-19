# 6.5 小结

本质上 raft 是以领导者为中心，选举出的领导者以“一切以我为准”的方式，达成值的共识和实现各个节点的一致。

在raft 算法中，副本数据是以日志的形式存在的，raft 算法规定日志必须是连续的，而 lamport 的 multi paxos 并不要求日志是连续的，而且在 raft 算法中，日志不仅是数据的载体，日志的完整性也影响着领导者选举的结果（日志完整性最高的节点优先当选）。

参考

- raft 动画 https://raft.github.io/raftscope/index.html
- 《In Search of an Understandable Consensus Algorithm》https://raft.github.io/raft.pdf
- 《Raft 分布式系统一致性协议探讨》https://zhuanlan.zhihu.com/p/510220698