# 6.3 Raft 算法

:::tip 额外知识
Raft 单词的由来是 Re{liable|plicated|dundant} And Fault-Tolerant（可靠、复制、冗余和容错）的组合起来，组合起来的单词 raft 在英文有「筏」的含义，隐喻 Raft 是一艘可以帮助你逃离 Paxos 小岛的救生筏。
:::

不可否认，Paxos 是一个划时代的共识算法。Raft 出现之前，绝大多数共识算法的实现都是基于 Paxos 或者受其影响，同时 Paxos 也成为了教学领域里讲解共识问题时的示例。

但不幸的是 Paxos 理解起来非常晦涩，虽然论文中定义了可能实现 Multi Paxos 的方法，但缺少对细节的描述，这些都导致了工业界和学术界对 Paxos 算法普遍感到十分头疼。在很长时间的一段时间内，实际上并没有一个被大众所认同的 Multi Paxos 算法。

那段时期，虽然所有的共识系统都是从 Paxos 开始的，但工程师在实现过程中发现有很多难以逾越的难题，往往不得已又开发出一种与 Paxos 完全不一样的架构，这就导致 Lamport 的证明并没有太大价值。
:::tip Chubby 作者评论 Paxos
Paxos 算法描述与工程实现之间存在巨大的鸿沟，最终实现的系统往往建立在一个还未被证明的算法之上。
:::

考虑到共识问题在大规模分布式系统的重要性，同时也为了在共识问题上提供更好的教学方法，斯坦福大学的学者们决定设计一个完全可以替代 Paxos 的共识算法，该算法的首要目的是能够被多数人理解，当然，容错和高效也是必备条件。

2013 年，斯坦福的 Diego Ongaro 和 John Ousterhout 发表了论文 《In Search of an Understandable Consensus Algorithm》[^1]提出了 Raft 算法，并给出了详细的实现细节，此后 Raft 算法成为分布式容错系统开发的首选共识算法。

Raft 论文开篇第一句就描述了 Raft 的证明和 Paxos 等价，Raft 天生就是 Paxos 协议的工程化。

:::tip Raft 论文开篇
Raft is a consensus algorithm for managing a replicated log. It produces a result equivalent to (multi-)Paxos, and it is as efficient as Paxos, but its structure is different from Paxos;
:::

作为一个强领导者模型算法，本节内容就以领导者选举、日志复制为线索讲解困扰 Paxos 难以落地的问题在 Raft 算法中是如何解决的。

[^1]: 论文参见 https://raft.github.io/raft.pdf，该论文是斯坦福教授 John Ousterhunt 指导 Diego Ongaro 完成的博士论文。