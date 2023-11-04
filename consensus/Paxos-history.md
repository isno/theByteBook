# 5.3.1 Paxos 起源

Paxos 最初的论文名称为《The Part-Time Parliament》，翻译成中文就是“兼职会议”，如果不事先说明，也许你根本不会认识到这一篇关于分布式的论文。Lamport 写这篇论文时，采用了一个虚构的古希腊岛屿（岛屿名称 Paxos，这也是 Paxos 算法名称的来源）上发生的故事来描述这个算法。为了说明这个算法，Lamport 做了几次演讲，为了演讲效果，Lamport 还扮演了几次《夺宝奇兵》中印第安纳·琼斯风格的考古学家。不幸的是 Paxos 论文中采用希腊民主议会的比喻很明显失败了，Lamport 像写小说一样，把一个复杂的数学问题弄成了一篇带有考古色彩的历史小说，听众没有记住 Paxos 算法，仅仅记住了印第安纳·琼斯。

1990 年，Lamport 将这篇论文提交给 TOCS。根据 Lamport 自己的描述[^2]，TOCS 的三个审稿人看过 Lamport 的论文后认为“该论文虽然不怎么重要但还有些意思，但应该把所有 Paxos 相关的故事背景删掉”。Lamport 对这些缺乏幽默感的人颇为不爽，他不打算对论文做任何修改，从而论文的发表被搁置。

虽然论文没有发表，但并不代表没有人关注这个算法。Bulter W.Lampson（1991年图灵奖获得者）认识到这个算法的重要性，并在他的论文中《How to Build a Highly Availability System using Consensus》对 Paxos 进行了描述。此后，De Prisco、Lynch 和 Lampson 联合在 TCS（Theoretical Computer Science）发表了他们对 Paxos 算法描述和证明的一篇论文《Revisiting the PAXOS algorithm》。正是经过 Lampson 等人的大力宣传，该算法才逐渐为理论研究界的人们所重视。

这些论文的发表使 Lamport 觉得论文重新发表的时间到了。一方面作为一种玩笑的延续；另一方面为保留原有的工作，这次发布仅增加了一段 Keith Marzullo（TOCS 编辑）注释，《The Part-Time Parliament》[^3] 最终在 1998 年公开发表。这次发布 Keith Marzullo 也风趣了一把：

:::tip Keith Marzullo 的注解

最近在 TOCS 编辑办公室的文件柜后面发现了这份投稿。尽管年代久远，主编仍认为值得发表。由于作者目前在希腊的群岛进行实地考察，无法联系，委托我准备文稿以发表。作者似乎是一位考古学家，对计算机科学只有短暂的兴趣。。。

:::




可还是有很多人抱怨这篇论文看不懂，人们只记住了那个奇怪的故事，而不是 Paxos 算法。Lamport 走到哪都要被人抱怨一通。于是他忍无可忍，2001 年使用计算机领域的概念重新描述了一遍算法，并发了论文 《Paxos Made Simple》[^4]。

<div  align="center">
	<img src="../assets/paxos.png" width = "350"  align=center />
</div>

是的，你没看错，摘要只有一句话 “The Paxos algorithm, when presented in plain English, is very simple.”！

然而，这篇论文还是非常难以理解，我们引用另一篇文章中关 于Paxos 算法的描述，摘自 USENIX ATC 2013 的 Best paper《In Search of an Understandable Consensus Algorithm》，大致含义说：Paxos真的太难懂了，很少有人不付出极大努力就能完全理解。在另一个高水平会议 NSDI 上，不少人对 Paxos 感到不爽。连点评者自己都和它做了很久的斗争，所以他这篇文章取名为“寻找一种易懂的一致性算法”...意思是还在寻找中，根本不像 Lamport 说的那么简单。后人无不感到 Lamport 深深的恶意。

直到 Google 的 Chubby 横空出世，使用 Paxos 解决了分布式共识的问题，并将其整理成正式的论文发表之后，得益于 Google 的行业影响力，辅以 Chubby 作者 Mike Burrows 那略显夸张但足够吸引眼球的评价推波助澜，Paxos 开始从理论界进入工业实践，并逐渐被大家熟知和认可。Lamport 凭借他在分布式领域的贡献，于 2013 年获得图灵奖。

讲完 Paxos 这段有趣的历史，下面我们逐层讲解 Paxos 算法。

[^2]: 参见 https://lamport.azurewebsites.net/pubs/pubs.html#lamport-paxos
[^3]: 参见 https://lamport.azurewebsites.net/pubs/lamport-paxos.pdf
[^4]: 参见 https://lamport.azurewebsites.net/pubs/paxos-simple.pdf