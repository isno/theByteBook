# 6.4 小结

Paxos 以及 Raft 算法属于故障容错（Crash Fault Tolerance，CFT）算法的范畴，解决的是分布式系统中存在故障，但不存在恶意节点下的分布式共识问题。

如果把共识问题扩展到包含恶意节点的情况时，那便进入了最困难、最复杂的分布式故障场景 —— 拜占庭容错（Byzantine Fault Tolerance）领域。谈及此处，你大概率会联想到数字货币和 Web3 等区块链技术。没错，这些技术正是基于拜占庭容错算法（譬如 PBFT、PoW）达成共识，从而实现了去中心化网络中的安全性和一致性。

限于篇幅以及笔者的精力，这部分内容就不再展开讨论，有兴趣的读者就自行探索吧。

参考文档：
- raft 动画，https://raft.github.io/raftscope/index.html
- 《In Search of an Understandable Consensus Algorithm》，https://raft.github.io/raft.pdf
- 《Raft 分布式系统一致性协议探讨》，https://zhuanlan.zhihu.com/p/510220698
- 《Implementing Replicated Logs
with Paxos》，https://ongardie.net/static/raft/userstudy/paxos.pdf