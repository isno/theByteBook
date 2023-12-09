# 6.4 Raft 算法

不可否认，Paxos 是一个划时代的共识算法。在 Raft 出现之前，绝大多数共识算法的实现都是基于 Paxos 或者受其影响，同时 Paxos 也成为了教学领域里讲解共识问题时的示例。

但不幸的是 Paxos 理解起来非常晦涩，虽然论文中定义了可能实现 Multi Paxos 的方法，但缺少实现细节，这些都导致了工业界和学术界都对 Paxos 算法感到十分头疼。在很长时间的一段时间内，并没有一个被大众所认同的 Multi Paxos 算法。

在那段时期，虽然所有的共识系统都是从 Paxos 开始的，但工程师在实现过程中发现有很多难以逾越的难题，往往不得已又开发出一种与 Paxos 完全不一样的架构，这就导致 Lamport 的证明并没有太大价值。笔者借用 Chubby 作者的一句话:
:::tip Chubby 作者评论 Paxos
Paxos 算法描述与工程实现之间存在巨大的鸿沟，最终实现的系统往往建立在一个还未被证明的算法之上。
:::

考虑到共识问题在大规模分布式系统的重要性，同时也为了再共识问题上提供更好的教学方法，斯坦福大学的学者们决定设计一个完全可以替代 Paxos 的共识算法，该算法的首要目的是能够被多数人理解，当然，容错和高效也是必备条件。

2013 年，斯坦福的 Diego Ongaro 和 John Ousterhout 发表了论文 《In Search of an Understandable Consensus Algorithm》提出了 Raft 算法，并给出了详细的实现细节，此后 Raft 算法成为分布式系统开发的首选共识算法。

:::tip 额外知识
Raft 的本意是 R{eliable|plicated|dundant} And Fault-Tolerant（可靠、复制、冗余和容错），组合起来的单词 raft 有筏的含义，隐喻这是一艘可以帮助你逃离 Paxos 小岛的救生筏（Raft）。
:::

raft 的论文开篇就是这么一段话，

:::tip 

Raft is a consensus algorithm for managing a replicated log. It produces a result equivalent to (multi-)Paxos, and it is as efficient as Paxos, but its structure is different from Paxos;

:::

raft 证明和 paxos 等价，所以说 raft 天生就是 paxos 协议的工程化，着眼点就是日志和状态机的方向


<div  align="center">
	<img src="../assets/raft-state-machine.png" width = "450"  align=center />
	<p>raft </p>
</div>



Raft 算法论文中包含领导者选举、日志复制、成员变更几个核心，在本节，笔者以这几个核心问题为线索讲解 Raft 算法的原理。