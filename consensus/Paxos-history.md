# 6.3.1 Paxos 算法起源

Paxos 算法最初的论文名称为《The Part-Time Parliament》，翻译成中文为“兼职议会”。

这篇论文的开头描述了一个虚构的古希腊岛屿考古发现故事。如果不事先说明，或许你根本不会意识到下面是一篇关于分布式的论文。
:::tip 《The Part-Time Parliament》

公元十世纪初，爱情海上的 Paxos 小岛是一个繁荣的商业中心。随着财富的积累，政治变得愈加复杂，Paxon 的公民用议会制政府取代了古老的神权政治。然而，商业利益高于公民义务，没人愿意将一生投入到议会事务中。因此，Paxon 议会必须在议员频繁进出议会的情况下，保持正常运作……
:::

为了说明 Paxos 算法并增强演讲效果，Lamport 演讲中多次扮演《夺宝奇兵》中的主角印第安纳·琼斯。遗憾的是，Paxos 论文中采用的希腊民主议会的比喻显然不太成功。Lamport 像写小说一样，把一个复杂的数学问题写成了一篇带有考古色彩的历史小说，听众没有记住 Paxos 算法，仅仅记住了印第安纳·琼斯。

1990 年，Lamport 将《The Part-Time Parliament》论文提交给 TOCS 期刊。根据 Lamport 的本人的回忆[^1]，TOCS 审稿人阅读后认为“这篇论文不怎么重要，但还有些意思”，并建议删掉与 Paxos 相关的故事背景。Lamport 对这些缺乏幽默感的审稿人颇为不爽，拒绝对论文进行修改。于是，论文的发表被搁置。

虽然论文没有发表，但不代表没有人关注这个算法，Bulter W.Lampson（1991 年图灵奖获得者）认识到 Paxos 算法的重要性，在他的论文《How to Build a Highly Availability System using Consensus》对 Paxos 算法进行了讲述。后来，De Prisco、Lynch 和 Lampson 几人联合在《理论计算机科学》期刊发表了论文《Revisiting the PAXOS algorithm》对 Paxos 算法进行了详细地描述和证明。经过 Lampson 等人的大力宣传，Paxos 算法逐渐被学术界重视。

另一方面，这些介绍 Paxos 算法的论文使 Lamport 觉得《The Part-Time Parliament》重新发表的时间到了。

或许作为玩笑的延续，或许为保留原有的工作，更直白的说法是 Lamport 认为论文描述和证明足够清晰，根本不需要任何修改，这次论文的发布仅增加了一段编辑的注解。有意思的是，编辑也风趣了一把。

:::tip <span></span>

最近在 TOCS 编辑办公室的文件柜发现了这份投稿。尽管年代久远，主编仍认为值得发表。由于作者目前在希腊的群岛进行实地考察，无法联系，委托我准备文稿以发表。作者似乎是一位考古学家，对计算机科学只有短暂的兴趣。。。

:::right 
—— TOCS 编辑 Keith Marzullo 的注解

:::
《The Part-Time Parliament》[^2] 论文最终在 1998 年公开发表。

《The Part-Time Parliament》论文发表之后，还是有很多人抱怨看不懂，人们只记住了那个奇怪的故事，而不是 Paxos 算法。Lamport 走到哪都要被人抱怨一通。于是他忍无可忍，在 2001 年使用计算机领域的概念重新描述了一遍算法，发表了论文 《Paxos Made Simple》[^3]。

这是一篇很短的论文，摘要只有一句话：“The Paxos algorithm, when presented in plain English, is very simple.”！语气完全无法掩盖作者对 Paxos 的策略没有奏效的失望。

:::center
  ![](../assets/paxos.png) <br/>
  图 6-4 《Paxos Made Simple》论文摘要
:::

然而，这篇论文还是非常难以理解，引用斯坦福大学学者 Diego Ongaro 和 John Ousterhout 在设计 Raft 时的论文[^4]中对 Paxos 的描述：

:::tip 《In Search of an Understandable Consensus Algorithm》节选

Unfortunately, Paxos has two significant drawbacks. The first drawback is that **Paxos is exceptionally difficult to understand**...

we were not able to understand the complete protocol until after reading several simplified explanations and designing our own alternative protocol, a process that took almost a year.
:::

上面大致的含义是，“Paxos 真的太难懂了...”。

连斯坦福的教授和博士都感觉难以理解。所以，他们的论文取名《In Search of an Understandable Consensus Algorithm》，意思是“易懂的共识算法还在寻找中”，根本不像 Lamport 说的那么简单。

注意 Raft 论文发表于 2013 年，而论文《Paxos Made Simple》是 2001 年发表的，也就是说 Paxos 算法已经被研究了十几年，直到 Google 的分布式锁服务 Chubby 横空出世，Chubby 使用 Paxos 共识算法实现强一致性，帮助 Google 解决了分布式系统中的资源协调问题。得益于 Google 的行业影响力，辅以 Chubby 作者 Mike Burrows 那略显夸张但足够吸引眼球的评价推波助澜，Paxos 算法从理论进入工业实践，逐渐被大家熟知和认可。

最终，Lamport 凭借他在分布式领域的贡献，于 2013 年获得图灵奖。

[^1]: 参见 https://lamport.azurewebsites.net/pubs/pubs.html#lamport-paxos
[^2]: 参见 https://lamport.azurewebsites.net/pubs/lamport-paxos.pdf
[^3]: 参见 https://lamport.azurewebsites.net/pubs/paxos-simple.pdf
[^4]: 参见 https://raft.github.io/raft.pdf
