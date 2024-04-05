# 9.2 可观测性与传统监控

初识可观测性之后，引来第一个问题：可观测性与传统监控区别是什么? 数据库专家 Baron Schwartz 用非常简洁的话总结了两者的关系，我们先看看他的解释。

:::tip 可观测与监控
监控告诉我们系统哪些部分是工作的，可观测性告诉我们那里为什么不工作了

:::right
——《高性能 MySQL》作者 by Baron Schwartz 
:::

最近几年发展的趋势是将可观测性放在一个更高的位置，监控只是可观测性的一个子集，如下所示。

<div  align="center">
	<img src="../assets/Monitoring-vs-Observability.png" width = "450"  align=center />
</div>


过去，一台物理机器的状态确实可以通过几个监控指标描述，但是随着系统越来越复杂，监控的对象渐渐地从基础设施转到应用，观察行为也从监控（Monitoring）进化到观测（Observability）。这两者虽然只是文字上的差别（也确实容易引起误解），但请仔细思考背后的含义。

笔者再借用 Donald Rumsfeld（前美国国防部长）关于 Known、Unknowns 的名言[^1]解释两者的区别，我们把系统的理解程度和可收集信息之间的关系进行象限化分析，如下图所示。

<div  align="center">
	<img src="../assets/observability-knowns.png" width = "500"  align=center />
</div>

X 轴的右侧称为 Known Knows（已知且理解）和 Known Unknowns（已知但不理解），这些信息通常是普适的事实，也就是在系统上线之前我们一定就能想到、并监控起来的（CPU Load、内存、TPS、QPS 之类的指标）。

过去大多数运维监控都是围绕观察 Known Knows、处理 Known Unknowns 这些确定的东西。

但还是有很多情况是这些基础信息很难描述和衡量。例如坐标的左上角：Unknown Knowns（未知的已知，通俗解释可称假设）。举个例子：为保证服务可用性时，通常会增加限流、熔断的机制，假设请求量突然异常，这些机制生效从而保证服务可用性。注意例子中`假设`的事情（请求突然增大）并没有发生，如果日常压力不大，很难从已有的基础监控中看出任何问题。但到出事的时候，未曾验证失误（限流逻辑写错）就变成我们最不愿意看到的 Unknown Unkowns（没有任何线索、也不理解的意外）。

经验丰富（翻了无数次车）的工程师会通过经验证实自己的推测将 Unknown Unknowns 的查询范围变小，从而缩短故障解决的时间。但更合理的做法是透过系统输出的蛛丝马迹（metrics、log、trace），并以一个低门槛且形象的方式（监控大盘、追踪链路拓扑、聚合离散的事件日志）描绘出系统更全面的状态。

如此，当发生 Unknown Unkowns 的情况时，才能具象化的一步步定位到根因。



[^1]: 参见 https://blog.sciencenet.cn/blog-829-1271882.html