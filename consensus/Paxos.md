# 5.3 Paxos 的起源

:::tip 额外知识
世界上只有一种共识协议，就是 Paxos，其他所有的共识算法都是 Paxos 的退化版本。

-- Mike Burrows，Google Chubby 作者
:::

Paxos 是由 Leslie Lamport 于 1990 提出的一种基于消息传递且具有高度容错特性的协商共识算法，是当今分布式系统最重要的理论基础，几乎就是“共识”两个字的代名词。

