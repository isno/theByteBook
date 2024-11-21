# 6.4.2 日志复制

前面的介绍中，笔者已经阐述过：Raft 的本质就是多个副本的日志数据达成一致的解决方案。

理解日志复制的问题之前，我们得先搞清楚 Raft 中的日志和日志项是什么。

分布式系统中有一种常见的复制状态机的抽象，就是把具有一定顺序的一系列动作抽象成一条日志（log），每个动作都是日志中的一个日志项（log entry）。我们可以把 Raft 中的日志项理解为包含以下几个关键数据的数据格式：

- **指令**: 一条由客户端请求转换成状态机需要执行的指令。
- **索引值**：日志项对应的整数索引值，用于标识日志项，是一个连续、单调递增的整数。如此，Raft 可以不用关注空洞日志，也可以通过最大日志索引定位缺失的数据。
- **任期编号**：创建这个日志项的 Leader 任期编号。

:::center
  ![](../assets/raft-log.svg) <br/>
 图 6-17 日志项概念
:::



## 1. 日志复制

Raft 是强 Leader 模型的算法，日志项只能由 Leader 复制给其他成员，这意味着日志复制是单向的，Leader 从来不会覆盖本地的日志项，即所有的日志项以 Leader 为准。

当 Raft 收到客户端的指令时（x<-3）：
- 如果当前节点不是 Leader，则把指令转发至 Leader；
- Leader 收到指令后先写入本地的日志仓库，然后向所有的 Follower 广播日志复制消息。
- 一旦 Leader 确认该指令充分复制（被多数派节点“Quorum”确认），该指令就会被“提交”（commit）。提交意味着，日志记录不会被回滚，可以安全地应用到状态机。
- Leader 更新 commit 水位，在随后的心跳或者日志复制请求消息中携带 commit 水位。Follower 收到心跳后更新本地的 commit 水位。

:::center
  ![](../assets/raft-append-entries.svg) <br/>
 图 6-17 日志项概念
:::


:::tip 选择节点的数量

Raft 的日志复制需要等待多数派节点确认。节点越多，复制延迟也相应增加。所以说，以 Raft 构建的分布式系统并不是节点越多越好。如 ETCD 推荐使用 3 个节点。对高可用性要求较高，且能容忍稍高的性能开销，可增加至 5 个节点。如果超出 5 个节点，则得不偿失。
:::

通过心跳或者下一次日志复制请求消息来通知 Follower 提交（committed）日志项。这种做法可以**使协商优化成一个阶段，降低处理客户端请求一半的延迟**。


## 2. 实现日志的一致性

当一个 Follower 新加入集群或 Leader 刚晋升时，Leader 并不清楚需要同步哪些日志给 Follower。此外，当旧的 Leader 转变为 Follower 时，可能携带上一任期（term）中仅在本地提交的日志项，而这些日志项在当前新的 Leader 上并不存在。

Raft 算法中，通过 Leader 强制 Follower 复制自己的日志项，来处理不一致的日志。具体包括两个步骤：

1. Leader 通过日志复制 RPC 的一致性检查，找到 Follower 与自己相同日志项的最大索引值。即在该索引值之前的日志，Leader 和 Follower 是一致的，之后的日志就不一致了；
2. Leader 强制将 Follower 该索引值之后的所有日志项删除，并将 Leader 该索引值之后的所有日志项同步至 Follower，以实现日志的一致。

因此，处理 Leader 与 Follower 日志不一致的关键是找出上述的最大索引值。

Raft 引入两个变量，来方便找出这一最大索引值：

- **prevLogIndex**：表示 Leader 当前需要复制的日志项，前面那一个日志项的索引值。例如，下图，如果领导者需要将索引值为 8 的日志项复制到 Follower，那么 prevLogIndex 为 7
- **prevLogTerm**：表示 Leader 当前需要复制的日志项，前面一个日志项的任期编号。例如，下图，如果领导者需要将索引值为 8 的日志项复制到 Follower ，那么 prevLogTerm 为 4


```json
{
  "term": 5,
  "leaderId": "leader-123",
  "prevLogIndex": 8,
  "prevLogTerm": 4,
  "entries": [
    { "index": 9, "term": 5, "command": "set x=42" },
  ],
  "leaderCommit": 7
}

```

:::center
  ![](../assets/raft-log-fix.svg) <br/>
 图 6-19 领导者处理不一致日志
:::

Leader 处理不一致的具体过程分析如下：

1. Leader 通过日志复制 RPC 消息，发送当前自己最新日志项给 Follower，该消息的 prevLogIndex 为 7，prevLogTerm 为 4。
2. 由于 Follower 在其日志中，无法找到索引值为 7，任期编号为 4 的日志项，即 Follower 的日志和 Leader 的不一致，故 Follower 会拒绝接收新的日志项，返回失败。
3. 此时，Follower 在其日志中，找到了索引值为 6，任期编号为 3 的日志项，故 Follower 返回成功。
4. Leader 收到 Follower 成功返回后，知道在索引值为 6 的位置之前的所有日志项，均与自己的相同。于是通过日志复制 RPC ，复制并覆盖索引值为 6 之后的日志项，以达到 Follower 的日志与 Leader 的日志一致。

:::center
  ![](../assets/raft-log-fix-action.svg) <br/>
图 6-20 Leader 处理不一致日志过程
:::

从上面的步骤看到，Leader 通过日志复制 RPC 消息的一致性检查，比较 index 和 term，从而找到 Follower 节点上与自己相同日志项的最大索引值，然后复制并更新该索引值之后的日志项，实现各个节点日志自动趋于一致。

