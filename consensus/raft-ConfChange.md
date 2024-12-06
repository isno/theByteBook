# 6.4.3 成员变更

前面的讨论中，我们假设集群节点数是固定的，也就是集群的 Quorum 是固定的。但生产环境中，有很多集群节点变更的情况，如节点故障需要移除、扩容增加节点等等。


讨论如何实现成员动态变更之前，先理解 Raft 中“配置”（configuration）的概念。

:::tip 配置
配置说明集群由哪些节点组成。例如，一个集群有三个节点（Server 1、Server 2、Server 3），该集群的配置就是 [Server1、Server2、Server3]。
:::

如果把“配置”当成 Raft 中的“特殊日志”。这样一来，成员的动态变更就可以转化为“配置日志”的一致性问题。但注意的是，各个节点中的日志“应用”（apply）到状态机是异步的，不可能同时操作。这种情况下，成员变更就会出现问题。

举个具体例子，假设当前有一个由三个节点 [Server1、Server2 和 Server3] 组成的 Raft 集群，当前集群配置为 C~old~。现在，我们计划增加两个节点 [Server1、Server2、Server3、Server4、Server5]，新的集群配置为 C~new~。

由于日志提交是异步进行的，假设 Server1 和 Server2 比较迟钝，仍在使用老配置 C~old~，而 Server3、Server4、Server5 的状态机已经应用了新配置 C~new~：

- 假设 Server5 触发选举并赢得 Server3、Server4、Server5 的投票（满足 C~new~ 配置下的 Quorum 3 要求），成为领导者；
- 同时，假设 Server1 也触发选举并赢得 Server1、Server2 的投票（满足 C~old ~配置下的 Quorum 2 要求），成为领导者。

在一个集群中，如果存在两个领导者，那么同一个日志索引可能会对应不同的日志条目，导致日志冲突和不一致。

:::center
  ![](../assets/raft-ConfChange.png) <br/>
  图 6-15 某一时刻，集群存在两个 Quorum 
:::

上述问题的根本原因在于，成员变更过程中形成了两个没有交集的 Quorum，即 [Server1, Server2] 和 [Server3, Server4, Server5] 各自为营。

最初，Diego Ongaro 在论文中提出了一种基于两阶段的“联合共识”（Joint Consensus）成员变更方案，但这种方案实现较为复杂。随后，Diego Ongaro 又提出一种更为简化的方案 — “单成员变更”（Single Server Changes）。该方案的核心思路是，既然同时提交多个成员变更可能会引发问题，那么每次只提交一个成员变更。如果需要添加多个成员，就执行多次单成员变更操作。

单成员变更方案能够有效穷举所有情况，如图 6-22 所示，穷举奇/偶数集群下节点添加/删除情况，如果每次只操作一个节点，C~old~ 的 Quorum 和 C~new~ 的 Quorum 一定存在交集。交集节点只会进行一次投票，要么投票给 C~old~，要么投票给 C~new~。因此，不可能出现两个符合条件的 Quorum，也就不会出现两个领导者。

以图 6-16 第二种情况为例，C~old~ 为 [Server1、Server2、Server3]，该配置的 Quorum 为 2，C~new~ 为 [Server1、Server2、Server3、Server4]，该配置的 Quorum 为 3。假设 Server1、Server2 比较迟钝，还在用 C~old~ ，其他节点的状态机已经应用 C~new~：
- 假设 Server1 触发选举，赢得 Server1，Server2 的投票，满足 C~old~ Quorum 要求，当选领导者；
- 假设 Server3 也触发选举，赢得 Server3，Server4 的投票，但**不满足 C~new~ 的 Quorum 要求，选举失效**。

:::center
  ![](../assets/raft-single-server.svg) <br/>
  图 6-16 穷举奇/偶数集群下节点添加/删除情况
:::


目前，绝大多数 Raft 算法的实现和系统，如 HashiCorp Raft 和 etcd，均采用单节点变更方案。由于联合共识方案的复杂性和实现难度，本文不再深入讨论，有兴趣的读者可以参考 Raft 论文以了解更多细节。