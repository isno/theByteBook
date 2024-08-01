# 9.3.5 核心转储 Core Dump

CNCF 可观测性白皮书中只提到了 core dump。不过 dumps 还应该包如 Heap dump（某时刻 Java 堆栈的快照）、Thread dump（某一时刻 Java 线程快照）等。


core dump 历史悠久，很早就出现在 Unix-like 系统中，在一个任何安装有《Linux man 手册》的 Linux 发行版上，都可以通过 man core 来查阅相关信息。

```bash
$ man core
...
A small number of signals which cause abnormal termination of a process
     also cause a record of the process's in-core state to be written to disk
     for later examination by one of the available debuggers.  (See
     sigaction(2).)
...
```
core 的意思是内存，dump 的意思是扔出来，只要程序异常终止或者崩溃系统时，Linux 系统就会将关键的程序运行状态保存在一个文件中（core dump 文件）。关键的运行状态数据包括寄存器信息（程序指针、栈指针）、内存管理信息、其他处理器和操作系统状态等等。当系统崩溃时，通过程序调试工具 gdb，就能分析出具体哪一行代码引发了程序崩溃。

但注意，由于 core dump 文件会占据大量的磁盘空间，复杂的应用程序崩溃时甚至能生成两位数 Gb 大小的文件。所以默认情况下，Linux 禁用了 core dump 功能，得通过命令 ulimit -c unlimited（不限制 core 文件大小）开启。


最后，虽然 CNCF 将 dumps 数据纳入了可观测体系，但众多的应用限制：应用和基础设施角色权限（容器应用与系统全局配置问题）、数据持久化的问题（Pod 在重启之前得把 core dump 文件写入持久卷），让 dumps 和 profiles 并没有像日志、metrics 产生系统化处理的方案。

早些年 Linux 社区[^1]以及 Docker 社区[^2]也在讨论容器中支持 core_pattern 独立配置，但毕竟分析 dumps 和 profiles 只是个极低概率的事情，所以这些方案和讨论并没有进展，目前还得依靠原始的手段去处理。

[^1]: 参见 https://lore.kernel.org/patchwork/patch/643798/
[^2]: 参见 https://github.com/moby/moby/issues/19289