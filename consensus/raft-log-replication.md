# 6.4.2 日志复制

理解日志复制的问题之前，我们得先搞清楚 Raft 中的日志和日志项是什么。

Raft 算法中，副本数据是以日志的形式存在的，Leader 接收到来自客户端的写请求后，处理写请求的活成就是一个复制和应用（Apply）日志项到状态机的过程。

日志项是一种数据格式，它包含用户指定的数据（或者说是指令 Command）以及其他附加信息，例如索引值（Log index，连续单调递增的数字）、任期编号（Term，创建这个日志项的 Leader 任期编号），如下图所示。

<div  align="center">
	<img src="../assets/raft-log.svg" width = "450"  align=center />
	<p>日志项</p>
</div>

## 日志复制

## 日志一致性

Raft 算法中，Leader 通过强制 followers 直接复制自己的日志项来处理不一致的日志。具体分为以下两个步骤：
