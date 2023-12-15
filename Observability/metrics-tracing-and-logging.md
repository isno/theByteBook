# 可观测性的三大支柱

在学术界，虽然“可观测性”这个名词是近几年才从控制理论中借用的舶来概念，不过其内容实际在计算机科学中已有多年的实践积累。

学术界一般会将可观测性分解为三个更具体方向进行研究，它们分别是**事件日志、链路追踪和聚合度量**，这三个方向各有侧重，又不是完全独立，它们天然就有重合或者可以结合之处，2017 年的分布式追踪峰会结束后，Peter Bourgon 撰写了总结文章《Metrics, Tracing, and Logging》[^1]系统地阐述了这三者的定义、特征以及它们之间的关系与差异，受到了业界的广泛认可。

<div  align="center">
	<img src="../assets/observability.png" width = "350"  align=center />
</div>

[^1]: 参见 https://peter.bourgon.org/blog/2017/02/21/metrics-tracing-and-logging.html