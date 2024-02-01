# Crash Dumps

即使代码写得再谨慎，免不了还是会发生崩溃事件，比如出现 Segment fault 错误，编译阶段不会报错，运行阶段也无任何可依靠的 trace 信息。

(cncf 只提到了 core dumps，但 dump 应该包含更多，heap dump、thread dump。。。)
好在 Linux 系统中，只要程序异常终止或者崩溃会主动将运行中的状态保存在一个文件中。这个文件叫 core dump 文件（core 的意思是内存，dump 的意思是扔出来）。我们可以认为 core dumps 是“内存快照”，但实际上，除了内存信息外，还有关键的程序运行状态也会 dump 下来。例如寄存器信息（程序指针、栈指针）、内存管理信息、其他处理器和操作系统状态等信息。


几个典型的让程序崩溃产生 core 文件的 signal 如下：

| Signal|  Action | 备注 |
|:--| :--| :--| 
| SIGQUT | | Quit from keyboard |
|SIGILL || Illegal Instruction |
|SIGABRT || abord signal from abord |
|SIGSEGV || Invalid memory reference |
|SIGTRAP || trace/breakpoint trap |

core dump 文件一般可以用来分析程序运行到底是哪出错了，最典型的使用是结合 gdb 分析，定位文件中引发 core dump 的行。当然并不一定程序崩溃了才能产生 core dump 文件，也可以使用 gdb 的 generate-core-file 命令生成一个 core 文件。

由于 core dump 文件会占据大量的磁盘空间（处理密集型的应用程序可能会生成两位数 Gb 大小的 core dump 文件），默认情况下，Linux 不允许生成 core dump 文件，得通过命令 ulimit -c unlimited（不限制 Core 文件大小）开启。


虽然 CNCF 把 dumps 数据纳入了可观测体系，但针对 dumps 数据的采集还尚未有成熟的方案，应用和基础设施角色权限（容器应用与系统全局配置问题），数据持久化的问题（例如 Pod 在重启之前得把 core dump 文件并写入持久卷）。RFC 讨论 Linux 内核社区中支持 core_pattern 的命名空间，而不是将其作为系统全局变量设置 [^1]，docker 社区早些年也在讨论允许每个 container 去设置 core dump 文件的 pattern[^2]。很遗憾，这些意见和方案到目前也没有进展。还是得依靠原始的手段去处理各类 dumps 文件（毕竟分析 dumps 文件只是个极低概率的工作，这些投入不如放在控制代码质量上）。

[^1]: 参见 https://lore.kernel.org/patchwork/patch/643798/
[^2]: 参见 https://github.com/moby/moby/issues/19289