# 可观测性与监控

可观测性与监控有很多相近之处，事实也确实如此，并很容易引起误解。关于这一点《高性能 MySQL》 作者有一个非常著名的见解，被大家广泛引用：

:::tip 可观测与监控
监控告诉我们系统哪些部分是工作的，可观测性告诉我们那里为什么不工作了

-- by Baron Schwartz
:::

换句话解释就是监控可以发现问题，可观测性更好地定位问题。它们之间的关系有一个很有表达力的示意图，如下。

<div  align="center">
	<img src="../assets/Monitoring-vs-Observability.png" width = "450"  align=center />
</div>

但这并不意味着有可可观测性，就不需要监控了。监控室对系统的持续观察，检测异常行为并发出报警，要解决已知的未知问题。而可观测性透过系统的输出（指标、日志、追踪）了解系统的内部状态，告诉你发生了什么、为什么发生以及如何修复，解决未知的未知问题。

可观测性不能替代监控的讨论，有兴趣的读者可以阅读 《Observability will never replace Monitoring (because it shouldn’t)》[^1]，作者 Ben Sigelman 是 Google Dapper、时序数据库 Monarch 的共同创始人，也是可观测性领域最重要的两个标准 OpenTelemetry 和 OpenTracing 的共同创始人。

[^1]: 参见 https://medium.com/lightstephq/observability-will-never-replace-monitoring-because-it-shouldnt-eeea92c4c5c9