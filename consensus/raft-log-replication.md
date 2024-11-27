# 6.4.2 日志复制

一旦集群选举出了 Leader，那么 Leader 便承担起“**将系统发生的所有变更复制到所有节点**”的职责。


图 6-17 展示了 Raft 集群中各个节点的日志情况，每个日志条目（log entry）包含了索引、任期、指令等关键信息：

- **指令**: 表示客户端请求的具体操作内容，也就是待“状态机”（State Machine）执行的操作。
- **索引值**：日志在仓库中的索引值，单调递增。
- **任期编号**：该日志是在哪个任期（Leader 任期）中被创建的，用于解决“脑裂”和日志不一致问题。

:::center
  ![](../assets/raft-log.svg) <br/>
 图 6-17 日志结构
:::

Raft 通过 RPC 消息将日志复制至各个 Follower 节点。用于日志复制的 RPC 被称为 AppendEntries RPC，它的结构大致如下：

```json
{
  "term": 5, // Leader 的当前任期号
  "leaderId": "leader-123",
  "prevLogIndex": 8, // 前一日志的索引
  "prevLogTerm": 4, // 前一日志的任期
  "entries": [
    { "index": 9, "term": 5, "command": "set x=4" }, // 要复制的日志条目
  ],
  "leaderCommit": 7// Leader 的“已提交”的索引号
}
```

根据图 6-17 来看日志复制的过程，当 Raft 集群收到客户端的请求（set x=4）时：

- 如果当前节点不是 Leader，则把指令转发至 Leader；
- Leader 接收请求后：
  - 将指令转换成日志条目（log entry）写入本地日志仓库，此时日志条目的状态为“未提交”（uncommitted）；
  - 生成一条 AppendEntries RPC，将日志条目广播至所有的 Follower；
- Follower 收到 Leader 的 AppendEntries RPC 后，检查任期以及日志一致性，将新日志条目追加到本地仓库。
- 一旦 Leader 确认日志条目被充分追加（也就是达到 Quorum 要求），Leader 便将日志条目标记为“已提交”（committed），并向客户端返回执行结果。已提交的日志意味着：指令永久生效，日志不可回滚，可以安全地“应用”（apply）到状态机。

:::center
  ![](../assets/raft-append-entries.svg) <br/>
 图 6-17 日志项概念
:::

Leader 向客户端返回结果，并不意味着日志复制的过程就此结束。Follower 并不知道哪些日志已经被大多数节点确认，Raft 的的方案是：Leader 在心跳或下一次日志复制中携带 leaderCommit，通知 Follower 当前已经提交的最高日志索引。这个设计的目的主要把 Quorum 确认优化成一个阶段，降低客户端请求延迟。


:::tip 如何选择节点的数量

Raft 的日志复制需要等待多数节点确认。节点越多，日志复制延迟也相应增加。所以说，以 Raft 构建的分布式系统并不是节点越多越好。如 ETCD，推荐使用 3 个节点，对高可用性要求较高，且能容忍稍高的性能开销，可增加至 5 个节点，如果超出 5 个节点，可能得不偿失。
:::

实际上，上面日志复制例子中，只有 follower-1 会成功，这是因为其他节点（follower-2）的日志缺少一些日志条目。**日志的连续性相当重要，顺序不一致性的日志应用到状态机，会导致各个 follower 节点状态不一致**。

follower-2 收到 AppendEntries 消息，根据 prevLogIndex、prevLogTerm 确认本地日志缺少或者冲突，它将返回失败信息：

```json
{
  "success": false,
  "term": 4,
  "conflictIndex": 4, // 表示发生缺失的日志索引，Follower 的日志中最大索引为 3，所以缺失的索引是 4。
  "conflictTerm": 3//缺失日志的“上一个有效日志条目”的任期号
}
```
这之后，Leader 根据上述信息找到一个与 Follower 日志匹配的最大索引（也就是 6），重新开始日志复制过程，逐步恢复与 Follower 的一致性。





