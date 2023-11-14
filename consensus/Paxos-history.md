# 5.3.1 Paxos 起源

Paxos 最初的论文名称为《The Part-Time Parliament》，翻译成中文就是“兼职议会”，论文描述了一个虚构的古希腊岛屿考古发现故事。

:::tip The Part-Time Parliament

最近的考古发现表明，在Paxos小岛上，尽管兼职议会成员都有逍遥癖，但议会模式仍然起作用。他们依旧保持了一致的会议记录，尽管他们频繁的进出会议室并且他们的信使还很健忘。Paxon 议会协议提供了一种新方法去实现设计分布式系统的状态机。

...
:::

如果不事先说明，也许你根本不会认识到这一篇关于分布式的论文。为了说明这个算法以及演讲效果，Lamport 的演讲中还扮演了几次《夺宝奇兵》中印第安纳·琼斯风格的考古学家。不幸的是 Paxos 论文中采用希腊民主议会的比喻很明显失败了，Lamport 像写小说一样，把一个复杂的数学问题弄成了一篇带有考古色彩的历史小说，听众没有记住 Paxos 算法，仅仅记住了印第安纳·琼斯。

1990 年，Lamport 将这篇论文提交给 TOCS。根据 Lamport 自己的描述[^2]，TOCS 的三个审稿人看过 Lamport 的论文后认为“该论文虽然不怎么重要但还有些意思，但应该把所有 Paxos 相关的故事背景删掉”。Lamport 对这些缺乏幽默感的人颇为不爽，他不打算对论文做任何修改，从而论文的发表被搁置。

虽然论文没有发表，但并不代表没有人关注这个算法。Bulter W.Lampson（1991 年图灵奖获得者）认识到这个算法的重要性，并在他的论文中《How to Build a Highly Availability System using Consensus》对 Paxos 进行了描述。此后，De Prisco、Lynch 和 Lampson 几人联合又在 TCS（Theoretical Computer Science）发表了一篇论文《Revisiting the PAXOS algorithm》对 Paxos 算法进行了详细地描述和证明。正是经过 Lampson 等人的大力宣传，该算法才逐渐为理论研究界的人们所重视。

另一方面，这些论文的发表使 Lamport 觉得《The Part-Time Parliament》重新发表的时间到了。或许作为一种玩笑的延续，也或许为保留原有的工作（更直白的说法是 Lamport 本人认为该论文内容的描述和证明足够清晰，根本不需要修改），这次发布仅增加了一段 Keith Marzullo（TOCS 编辑）注解，《The Part-Time Parliament》[^3] 最终在 1998 年公开发表。这次发布 Keith Marzullo 在注解上也风趣了一把：

:::tip Keith Marzullo 的注解

最近在 TOCS 编辑办公室的文件柜后面发现了这份投稿。尽管年代久远，主编仍认为值得发表。由于作者目前在希腊的群岛进行实地考察，无法联系，委托我准备文稿以发表。作者似乎是一位考古学家，对计算机科学只有短暂的兴趣。。。

:::

这篇论文发表之后，还是有很多人抱怨这篇论文看不懂，人们只记住了那个奇怪的故事，而不是 Paxos 算法，Lamport 走到哪都要被人抱怨一通。于是他忍无可忍，2001 年使用计算机领域的概念重新描述了一遍算法，并发了论文 《Paxos Made Simple》[^4]。

这是一篇很短的论文，摘要只有一句话 “The Paxos algorithm, when presented in plain English, is very simple.”！它的语气掩盖了作者对 Paxos 的策略没有完全奏效的失望。

<div  align="center">
	<img src="../assets/paxos.png" width = "350"  align=center />
</div>

然而，这篇论文还是非常难以理解，我们引用 Diego Ongaro 和 John Ousterhout 设计 Raft 时发表的论文[^5]中对 Paxos 的描述：

:::tip Paxos 一点也不 simple

Unfortunately, Paxos has two significant drawbacks. The first drawback is that Paxos is exceptionally difficult to understand ...

we were not able to understand the complete protocol until after reading several simplified explanations and designing our own alternative protocol, a process that took almost a year.
:::

上面大致含义说”Paxos 真的太难懂了...“。就连 USENIX ATC best paper 的作者都感觉难以理解，所以这篇论文取名《In Search of an Understandable Consensus Algorithm》（”寻找一种易懂的共识算法“ 意思是还在寻找中，根本不像 Lamport 说的那么简单）。

注意这篇文章发表于 2013 年，而《Paxos Made Simple》是 2001年 发表的。也就是说，Paxos 已经被研究了十几年，直到 Google 的 Chubby 横空出世，使用 Paxos 解决了现实中的分布式共识的问题，并将其整理成正式的论文发表之后，得益于 Google 的行业影响力，辅以 Chubby 作者 Mike Burrows 那略显夸张但足够吸引眼球的评价推波助澜，Paxos 开始从理论界进入工业实践，并逐渐被大家熟知和认可。

80 年代的分布式系统理论进展，触及了彼时无法想象的未来，Lamport 凭借他在分布式领域的贡献，于 2013 年获得图灵奖。


[^2]: 参见 https://lamport.azurewebsites.net/pubs/pubs.html#lamport-paxos
[^3]: 参见 https://lamport.azurewebsites.net/pubs/lamport-paxos.pdf
[^4]: 参见 https://lamport.azurewebsites.net/pubs/paxos-simple.pdf
[^5]: 参见 https://raft.github.io/raft.pdf USENIX ATC 2013 年 best paper
