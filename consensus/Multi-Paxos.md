# 5.3.4 Multi Paxos

:::tip 额外知识
lamport 提到的 Multi Paxos 是一种思想，所以 Multi Paxos 算法实际上是个统称，Multi Paxos 算法是指基于 Multi Paxos 思想，通过多个 Basic Paxos 实例实现的一系列值的共识算法。
:::

Paxos Basic 只能对一个值形成决议，而且决议形成至少需要两次网络来回，高并发情况还有可能形成活锁，因此 Basic Paxos 几乎只是用来做理论研究，并不直接应用在实际工程中。

既然 Paxos Basic 可以确定一个值，**想确定多个值那就运行多个 Paxos Basic ，然后将这些值列成一个序列，在这个过程中并解决效率问题** -- 这就是 Multi Paxos 。 

Multi-Paxos 基于 Basic Paxos 做了两点改进：

- 针对每一个要确定的值，运行一次 Paxos Basic 实例（Instance）形成决议。每一个 Paxos Basic 实例使用唯一的 Instance ID 标识。
- 在所有 Proposers 中选举一个 Leader，由 Leader 唯一地提交 Proposal 给 Acceptors 进行表决。这样没有 Proposer 竞争，解决了活锁问题。在系统中仅有一个 Leader 进行 Value 提交的情况下，Prepare 阶段就可以跳过，从而将两阶段变为一阶段，提高效率。



Multi-Paxos 新增的问题是如何选择 log entry，并且用选主的方式减少冲突，以及减少 prepare 的请求。



<div  align="center">
	<img src="../assets/multi_paxos.png" width = "500"  align=center />
	<p></p>
</div>

