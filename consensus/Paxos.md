# 6.2 Paxos 算法

:::tip <a/>
世界上只有一种共识协议，就是 Paxos，其他所有的共识算法都是 Paxos 的退化版本。

:::right
—— Mike Burrows，Google Chubby 作者
:::

提及分布式系统，大部分读者应该都能想到 Paxos。Paxos 是 Leslie Lamport 在 1990 提出的一种**基于消息传递且具有高度容错特性的协商共识算法**，是当今分布式系统最重要的理论基础，几乎就是“共识”两个字的代名词。

Paxos 因算法复杂而著名，围绕着该算法曾经发生过非常有趣的事情，这些也已成为人们津津乐道的一段轶事。直接切入 Paxos 算法本身未免望文生畏，我们从这段轶事开始学习 Paxos 之旅。

:::tip <a/>
Paxos 以及 Raft 部分论证内容及配图来源于 《Implementing Replicated Logs with Paxos》以及《In Search of an Understandable Consensus Algorithm》这两篇论文，在此统一注明，后面不再单独列出。
:::