# Profiles

了解 Profiles ，你可能需要先了解一下 Profiling。先看看 wiki 百科的解释：

:::tip Profiling

在软件工程中，性能分析（performance analysis也称为profiling），是以收集程序运行时信息为手段研究程序行为的分析方法，是一种动态程序分析的方法。

:::

可以看出，Profiling 是一个关于动态程序分析的术语，很多编程语言或框架也提供了丰富的 Profiling Tools，熟悉 Go 语言的朋友一定了解 pprof，当运行异常时，通过 pprof CPU profiling 或者 Memory profiling 分析函数耗时以及内存占用情况，展示形式以 Flame Graph 火焰图表达。其他语言也有 pprof 的实现，例如 Rust 的 pprof-rs。

可观测中的 Profiles 聚焦在理解资源是如何在系统中被分配的，一般包括：

- CPU Profilers
- Heap Profilers
- GPU Profilers
- Mutex Profilers
- IO Profilers
- Language-specific Profilers（e.g. JVM Profiler）

Traces 让我们了解延迟问题是分布式系统的的哪个部分导致的，而 Profiles 则使我们进一步定位到具体的函数具体的代码，更加深入挖掘并理解那些导致延迟问题存在的原因，是回答从“是什么”到“为什么”的重要数据。
