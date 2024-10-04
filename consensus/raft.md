# 6.3 Raft 算法

:::tip 额外知识
Raft 是由 Re{liable|plicated|dundant} And Fault-Tolerant 组合起来的单词，意思是可靠、复制、冗余和容错。同时，该词在英文有“筏”的含义，隐喻 Raft 是一艘可以帮助你逃离 Paxos 小岛的救生筏。
:::

不可否认，Paxos 是一个划时代的共识算法。Raft 出现之前，绝大多数共识系统都是基于 Paxos 或者受其影响，同时 Paxos 也成为了教学领域里讲解共识问题时的示例。

但不幸的是，Paxos 理解起来非常晦涩。此外，虽然论文中提到了 Multi Paxos，但缺少实现细节的描述。因此，无论是学术界还是工业界普遍对 Paxos 算法感到十分头疼。那段时期，虽然所有的共识系统都是从 Paxos 开始的，但工程师在实现过程中发现有很多难以逾越的难题，往往不得已又开发出与 Paxos 完全不一样的算法，这导致 Lamport 的证明并没有太大价值。

所以，在很长的一段时间内，实际上并没有一个被大众所认同的 Paxos 算法。

:::tip Chubby 作者评论 Paxos
Paxos 算法描述与工程实现之间存在巨大的鸿沟，最终实现的系统往往建立在一个还未被证明的算法之上。
:::

考虑到共识问题在分布式系统的重要性，同时为了提供一种更易于理解的教学方法，斯坦福大学的学者们决定重新设计一个完全可以替代 Paxos 的共识算法。该算法的首要目的是能够被多数人理解，当然，必须满足容错和高效这两个关键要求。

2013 年，斯坦福的 Diego Ongaro 教授和 John Ousterhout 博士发表了论文 《In Search of an Understandable Consensus Algorithm》[^1]，提出了 Raft 算法。Raft 论文开篇第一句描述了 Raft 的证明和 Paxos 等价，然后详细描述了算法如何实现，也就是说 Raft 天生就是 Paxos 算法的工程化。

:::tip 《In Search of an Understandable Consensus Algorithm》开篇
Raft is a consensus algorithm for managing a replicated log. It produces a result **equivalent to (multi-)Paxos, and it is as efficient as Paxos,** but its structure is different from Paxos;
:::

此后，Raft 算法成为分布式容错系统开发的首选共识算法。

接下来，本节内容以领导者选举、日志复制和集群成员动态变更为例，讲解在 Paxos 难以落地的问题，Raft 算法是如何设计和妥善解决的。

[^1]: 论文参见 https://raft.github.io/raft.pdf