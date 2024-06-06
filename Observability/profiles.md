# 9.3.4 Profiles

熟悉 Go 语言的朋友一定了解 pprof，当我们需要对软件进行性能分析时，可以通过 pprof 的 CPU profiling 或者 Memory profiling 功能分析函数耗时以及内存占用情况。

可观测中的 Profiles 和 Go 中的 pprof 是一个概念，就是对动态程序进行 profiling 时程序运行的动态画像，可以让我们足够细地了解到程序使用各类资源的全貌，是回答从“是什么”到“为什么”的依据。例如通过 trace 获知延迟在什么地方产生，再通过 Profiles 定位到是哪行代码影响。

Profiles 数据一般表示成火焰图、堆栈图，内存分析图等形式，2021年国内某站崩溃，工程师们就是使用火焰图观察到到一处 Lua 代码存在异常，才找到问题的源头[^1]。

:::center
  ![](../assets/lua-cpu-flame-graph.webp)<br/>
  图 9-20 Lua 级别的 CPU 火焰图
:::

可观测中的 Profiles 数据由多种不同的 Profiler 组成，常见的有：

- CPU Profilers （CPU 分析器）。
- Heap Profilers（堆分析器）。
- GPU Profilers （GPU 分析器）。
- Mutex Profilers （互斥锁分析器）。
- IO Profilers （IO 分析器）。
- Language-specific Profilers（特定于语言的分析器，例如 JVM Profiler）。

传统上，这些 Profiler 并不适合在产生环境中运行（开销很大），不过由于采样分析变得越来越可行（只增加了很少的开销），这使得生产环境中添加 Profiler 观察某段时间内的全局 Profiles 数据成为可能。

[^1]: 参见《2021.07.13 我们是这样崩的》https://www.bilibili.com/read/cv17521097/