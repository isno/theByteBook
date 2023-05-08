# Raft


raft是工程上使用较为广泛的强一致性、去中心化、高可用的分布式协议，raft是一个paxos 协议衍生出来的共识算法（consensus algorithm）。所谓共识，就是多个节点对某个事情达成一致的看法，即使是在部分节点故障、网络延时、网络分割的情况下，在分布式系统中，共识算法更多用于提高系统的容错性，比如分布式存储中的复制集（replication）。

本质上，分布式事务和共识协议解决的两类问题：

- 2PC等协议解决的是分布式事务的一致性，存储的数据各有不同，目标侧重于ACID
- Paxos/raft 解决的是副本间数据的一致性和高可用，存储的数据完全一致，目标侧重于replication


raft 算法将分布式一致性分解为多个子问题，包括 Leader 选举（Leader election）、日志复制（Log replication）、安全性（Safety）、日志压缩（Log compaction）等。

raft将系统中的角色分为领导者（Leader）、跟从者（Follower）和候选者（Candidate）

- **Leader**：接受客户端请求，并向 Follower 同步请求日志，当日志同步到大多数节点上后高速Follower提交日志。
- **Follower**：接受并持久化 Leader 同步的日志，在 Leader 告知日志可以提交后，提交日志。当 Leader 出现故障时，主动推荐自己为候选人。
- **Candidate**：Leader 选举过程中的临时角色。向其他节点发送请求投票信息，如果获得大多数选票，则晋升为 Leader


raft 要求系统在任意时刻最多只有一个 Leader，正常工作期间只有 Leader 和 Follower ，Raft 算法将时间划分为任意不同长度的任期(Term),每一任期的开始都是一次选举，一个或多个候选人会试图称为 Leader，在成功选举 Leader 后，Leader 会在整个任期内管理整个集群，如果 Leader 选举失败，该任期就会因为没有 Leader 而结束，开始下一任期，并立刻开始下一次选举。
