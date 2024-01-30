# Crash Dumps

即使代码写得再谨慎，免不了还是会发生各种意外的事件，比如出现 Segment fault 错误，编译阶段不会报错，运行阶段无法依靠任何 trace 信息。

好在 Linux 系统中，只要程序异常终止或者崩溃会主动将运行中的状态保存在一个文件中。这个文件叫 core dump 文件（core 的意思是内存，dump 的意思是扔出来）。我们可以认为 core dumps 是“内存快照”，但实际上，除了内存信息外，还有关键的程序运行状态也会 dump 下来。例如寄存器信息（程序指针、栈指针）、内存管理信息、其他处理器和操作系统状态等信息。


几个典型的让程序崩溃产生 core 文件的 signal 如下：

| Signal|  Action | 备注 |
|:--| :--| :--| 
| SIGQUT | | Quit from keyboard |
|SIGILL || Illegal Instruction |
|SIGABRT || abord signal from abord |
|SIGSEGV || Invalid memory reference |
|SIGTRAP || trace/breakpoint trap |

core dump 文件一般可以用来分析程序运行到底是哪出错了，最典型的使用是结合 gdb 分析，定位文件中引发core dump的行。当然并不一定程序崩溃了才能产生 core dump 文件，也可以使用 gdb 的 generate-core-file 命令生成一个 core 文件。

由于 core dump 文件会占据一定的磁盘空间（处理密集型的应用程序可能会生成两位数 Gb 大小的 core dump 文件），默认情况下，Linux 不允许生成 core dump 文件，得通过命令 ulimit -c unlimited（不限制 Core 文件大小）开启。


虽然把 dumps 数据纳入了可观测体系，但针对 dumps 数据的采集还尚未有成熟的方案，应用和基础设施角色权限（譬如应用无法访问系统全局配置的权限），数据持久化的问题（崩溃的应用，例如 Pod在重启之前要收集的核心 dump 文件并写入持久卷）。

RFC 讨论 Linux内核社区中支持 core_pattern 的命名空间，而不是将其作为系统全局变量设置 [^1]

虽然 docker 社区中有一些方案，例如允许每个 container 去设置 core dump 文件的 pattern[^2]，但目前来看，这些意见和方案到目前也没有进展。还是得依靠原始的手段去处理各类 dumps 文件。

[^1]: 参见 https://lore.kernel.org/patchwork/patch/643798/
[^2]: 参见 https://github.com/moby/moby/issues/19289