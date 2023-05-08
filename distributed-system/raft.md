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

<div  align="center">
	<img src="../assets/raft.png" width = "300"  align=center />
</div>

Raft算法将时间划分为不定长度的任期Terms，Terms为连续的数字。每个Term以选举开始，如果选举成功，则由当前leader负责出块，如果选举失败，并没有选举出新的单一Leader，则会开启新的Term，重新开始选举。

<div  align="center">
	<img src="../assets/raft-term.png" width = "350"  align=center />
</div>

## Leader 选举

Raft使用心跳机制来触发领导者选举，当服务器启动时，初始化都是Follower身份，由于没有Leader，Followers无法与Leader保持心跳，因此，Followers会认为Leader已经下线，进而转为Candidate状态，然后Candidate向集群其他节点请求投票，同意自己成为Leader，如果Candidate收到超过半数节点的投票(N/2 +1)，它将获胜成为Leader。

<div  align="center">
	<img src="../assets/raft-vote.png" width = "500"  align=center />
</div>

Leader 向所有 Follower 周期性发送 heartbeat，如果 Follower 在选举超时时间内没有收到 Leader 的 heartbeat，就会等待一段随机的时间后发起一次 Leader 选举。

<div  align="center">
	<img src="../assets/raft-vote-2.png" width = "500"  align=center />
</div>

## 日志同步

Raft算法实现日志同步的具体过程如下：

- Leader收到来自客户端的请求，将之封装成log entry并追加到自己的日志中；
- Leader并行地向系统中所有节点发送日志复制消息；
- 接收到消息的节点确认消息没有问题，则将log entry追加到自己的日志中，并向Leader返回ACK表示接收成功；
- Leader若在随机超时时间内收到大多数节点的ACK,则将该log entry应用到状态机并向客户端返回成功。

<div  align="center">
	<img src="../assets/raft-log.png" width = "500"  align=center />
</div>
