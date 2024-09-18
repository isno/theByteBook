# 9.3.5 核心转储 Core dump

核心转储（Core dump）历史悠久，很在就在 Unix 类系统中出现。在任何安装了《Linux man 手册》的 Linux 发行版上，都可以通过运行 man core 来查阅相关信息。

```bash
$ man core
...
A small number of signals which cause abnormal termination of a process
     also cause a record of the process's in-core state to be written to disk
     for later examination by one of the available debuggers.  (See
     sigaction(2).)
...
```

核心转储（Core dump）中的 “core” 代表程序的关键运行状态，而 “dump” 意为导出或快照。在 Linux 系统中，当程序异常终止或系统崩溃时，Linux 系统会将程序的关键运行状态保存到一个 core dump 文件中。这个文件中包含寄存器信息（如程序指针、栈指针）、内存管理信息以及其他处理器和操作系统的状态数据。借助 Linux 系统下的程序调试工具 gdb，就能从 core dump 文件中分析出具体哪一行代码引发了程序崩溃。

:::tip  注意

由于 core dump 文件会占用大量磁盘空间，复杂应用程序崩溃时甚至能生成几十 GB 的文件。因此，Linux 默认禁用了 core dump 功能。如果需要启用 core dump，必须通过命令 ulimit -c unlimited 取消对 core 文件大小的限制。

:::


此外，CNCF 发布的可观测性白皮书中仅提及了 core dump，实际上 dumps 的范围应该扩展到包括 Heap dump（Java 堆栈在特定时刻的快照）和 Thread dump（特定时刻的 Java 线程快照）、Memory dump（内存快照）等等。

最后，虽然 CNCF 将 dumps 纳入可观测性体系，但由于容器应用与系统全局配置的冲突、数据持久化的挑战（如在 Pod 重启前需要将 core dump 文件写入持久卷）等众多限制，导致 dumps 尚未像性能剖析那样形成改进后的处理方案。目前，处理及分析 dumps 数据仍然得用传统的手段。