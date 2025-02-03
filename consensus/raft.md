# 6.4 Raft 算法

:::tip 额外知识
Raft 是由 Re{liable|plicated|dundant} And Fault-Tolerant 组合起来的单词，意思是可靠、复制、冗余和容错。同时，Raft 在英文有“筏”的含义，隐喻一艘帮助你逃离 Paxos 小岛的救生筏。
:::

不可否认，Paxos 是一个划时代的共识算法。

Raft 算法出现之前，绝大多数共识系统都是基于 Paxos 算法或者受其影响。同时，Paxos 算法也成为教学领域里讲解共识问题时的范例。不幸的是，Paxos 算法理解起来非常晦涩。此外，论文虽然提到了 Multi Paxos，但缺少实现细节。因此，无论是学术界还是工业界普遍对 Paxos 算法感到十分头疼。

那段时期，虽然所有的共识系统都是从 Paxos 算法开始的，但工程师们实现过程中有很多难以逾越的难题，往往不得已开发出与 Paxos 完全不一样的算法，这导致 Lamport 的证明并没有太大价值。所以，很长的一段时间内，实际上并没有一个被大众广泛认同的 Paxos 算法。

:::tip <a/>
Paxos 算法的理论描述与实际工程实现之间存在巨大鸿沟，最终实现的系统往往建立在一个尚未完全证明的算法基础之上。
:::right
—— Chubby 作者评论 Paxos
:::

考虑到共识问题在分布式系统的重要性，同时为了提供一种更易于理解的教学方法，斯坦福大学的学者们决定重新设计一个替代 Paxos 的共识算法。

2013 年，斯坦福大学的学者 Diego Ongaro 和 John Ousterhout 发表了论文 《In Search of an Understandable Consensus Algorithm》[^1]，提出了 Raft 算法。Raft 论文开篇描述了 Raft 的证明和 Paxos 等价，详细阐述了算法如何实现。也就是说，Raft 天生就是 Paxos 算法的工程化。

:::tip 《In Search of an Understandable Consensus Algorithm》节选
Raft is a consensus algorithm for managing a replicated log. It produces a result **equivalent to (multi-)Paxos, and it is as efficient as Paxos,** but its structure is different from Paxos;
:::

此后，Raft 算法成为分布式系统领域的首选共识算法。

接下来，笔者将从领导选举、日志复制、成员变更三个方面展开，讨论 Raft 算法是如何妥善解决分布式系统一致性需求的。

[^1]: 论文参见 https://raft.github.io/raft.pdf