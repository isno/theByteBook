# 5.3.2 Paxos 算法
Pax 算法包含两个部分，其中一部分是核心算法；另外一部分是基于核心算法扩展的完整算法。

在 Lamport 的 《The Part-Time Parliament》论文中并没有给核心算法和完整算法起个名字，甚至都没有明确该论文在讲述一个分布式算法。Lamport 的论文中 ”**单法令会议**“（Single-Decree Synod）的制度确定单个法令，通过一种叫 ”**多法令国会**“（Multi-Decree Parliament）的制度来确定所有的法令以及法令体系。”单法令会议“故事就是在隐喻核心算法，”多法令国会“的故事则是隐喻完整算法。

《Revisiting the PAXOS algorithm Bulter》中 Lampson 将核心算法和完整算法分别命名为 **basic paxos** 和 **multi paxos**。


|| The Part-Time Parliament | Paxos Made Simple | Revisiting The PAXOS algorithm|
|:--|:--|:--|:--|
| 核心算法 | Single-Decree Synod | Paxos consensus | basic paxos |
| 完整算法 | Multi-Decree Parliament | Paxos 算法 | multi paxos |