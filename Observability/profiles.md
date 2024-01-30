# Profiles

了解 Profiles ，你可能需要先了解一下 Profiling。先看看 wiki 百科的解释：

:::tip Profiling

在软件工程中，性能分析（performance analysis也称为profiling），是以收集程序运行时信息为手段研究程序行为的分析方法，是一种动态程序分析的方法。

:::

可以看出，Profiling 是一个关于动态程序分析的术语，很多编程语言或框架也提供了丰富的 Profiling Tools，熟悉 Go 语言的朋友一定了解 pprof，当运行异常时，通过 pprof CPU profiling 或者 Memory profiling 分析函数耗时以及内存占用情况，展示形式以 Flame Graph（火焰图）表达。2021年国内某站崩溃[^1]，工程师们使用火焰图观察到到某一处 Lua 代码存在异常时，才找到问题的源头。

<div  align="center">
	<img src="../assets/lua-cpu-flame-graph.webp" width = "500"  align=center />
	<p>Lua 级别的 CPU 火焰图</p>
</div>

可观测中的 Profiles 聚焦在理解资源是如何在系统中被分配的，一般包括：

- CPU Profilers （CPU 分析器）
- Heap Profilers（堆分析器）
- GPU Profilers （GPU 分析器）
- Mutex Profilers （互斥锁分析器）
- IO Profilers （IO 分析器）
- Language-specific Profilers（特定于语言的分析器 JVM Profiler）

传统上，这些分析器并不适合在产生环境中运行（开销很大），不过由于采样分析变得越来越可行（只增加了百分之几的开销），这使得临时在生产环境中添加分析器，尽可能地观察到一段时间内的全局 Profiles 数据成为可能。

Traces 让我们了解延迟问题是分布式系统的的哪个部分导致的，而 Profiles 则使我们进一步定位到具体的函数具体的代码，更加深入挖掘并理解那些导致延迟问题存在的原因，是回答从“是什么”到“为什么”的重要数据。


[^1] 参见:《2021.07.13 我们是这样崩的》https://www.bilibili.com/read/cv17521097/