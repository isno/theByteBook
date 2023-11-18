# 5.3.2 Paxos 算法

希望你没有对前篇 Paxos 的“复杂”做的铺垫所吓倒，反正又不是要读论文，也不是要实现它。放弃严谨、简化掉最繁琐的分支细节和特殊情况的话 Paxos 还是可以能通俗地理解的。这一节，我们从故事回到算法本身，正式开始学习 Paxos。

Paxos 算法包含两个部分，其中一部分是核心算法；另外一部分是基于核心算法扩展的完整算法。

不过 Lamport 的 《The Part-Time Parliament》论文中并没有给核心算法和完整算法起个名字，甚至都没有明确该论文在讲述一个分布式算法。论文中 paxos的岛民通过”**单法令会议**“（Single-Decree Synod）的制度确定单个法令，通过一种叫 ”**多法令国会**“（Multi-Decree Parliament）的制度来确定所有的法令以及法令体系。”单法令会议“故事就是在隐喻核心算法，”多法令国会“的故事则是隐喻完整算法。

《The Part-Time Parliament》发表之后，很多人详细完整地重新阐述了这个算法，其中比较知名的就是前面提过的 Bulter W.Lampson。Lampson 很善于把复杂的问题讲清楚，在他的论文中《Revisiting the PAXOS algorithm Bulter》将核心算法和完整算法分别命名为 **Basic Paxos** 和 **Multi-Paxos**，这也是目前行业内广泛采用的命名。

Lamport 在 2001 年发表的 “Paxos Made Simple” 论文中又重新阐述了一遍 Paxos 算法，该论文仍然没有给出两个算法的正式命名，不过 Lamport 将算法所起的作用作为论文小节的标题。其中核心算法的小节标题是 “**The Consensus Algorithm**”（共识算法），完整算法的小节标题是“**Implementing a State Machine**”（实现一个状态机）。从这两个小节标题可以看出：Paxos 核心算法解决了分布式领域最重要的基础问题，也就是共识问题；完整算法是用来实现状态机的算法。在论文中，Lamport 也用 **Paxos Consensus Algorithm**、**Paxos Algorithm** 来分别称呼核心算法和完整算法。

因行业多采用 Lampson 的命名，本文沿用这种惯例。不过为避免歧义，笔者将 Paxos 算法名称汇总，以供参考。

|| The Part-Time Parliament | Paxos Made Simple | Revisiting The PAXOS algorithm|
|:--|:--|:--|:--|
| 核心算法 | Single-Decree Synod | consensus 算法/Paxos consensus算法 | Basic Paxos |
| 完整算法 | Multi-Decree Parliament | State Machine/Paxos 算法 | Multi-Paxos |


在笔者看来 Basic Paxos 是 Multi-Paxos 思想的核心，说直接点 Multi-Paxos 就是多执行几次 Basic Paxos，所以掌握了 Basic Paxos，我们便能更好的理解后面基于 Multi-Paxos 思想的共识算法（比如 raft）。

那么我们就先来看看 Basic Paxos 是如何解决共识问题的。
