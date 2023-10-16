# 5.1 Paxos

:::tip <i></i>

这个世界上只有一种共识协议，那就是 Paxos，其他所有的共识算法都是 Paxos 的退化版本。

-- Mike Burrows， Google Chubby 作者
:::

Paxos 是由 Leslie Lamport（就是大名鼎鼎的 LaTex 中的 “La”）于 1990 提出的一种基于消息传递且具有高度容错特性的协商共识算法，是当今分布式系统最重要的理论基础，几乎就是“共识”两个字的代名词。

尽管 Paxos 算法已经面世 30 多年，仍有层出不穷的解读。