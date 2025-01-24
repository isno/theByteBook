# 9.3.5 核心转储

核心转储（Core dump）中的 “core” 代表程序的关键运行状态，“dump” 的意思是导出。

核心转储历史悠久，很早就在各类 Unix 系统中出现。在任何安装了《Linux man 手册》的 Linux 发行版中，都可以运行 man core 命令查阅相关信息。

```bash
$ man core
...
A small number of signals which cause abnormal termination of a process
     also cause a record of the process's in-core state to be written to disk
     for later examination by one of the available debuggers.  (See
     sigaction(2).)
...
```

上面的大致意思是，当程序异常终止时，Linux 系统会将程序的关键运行状态（如程序计数器、内存映像、堆栈跟踪等）导出到一个“核心文件”（core file）中。工程师通过调试器（如 gdb）打开核心文件，查看程序崩溃时的运行状态，从而帮助定位问题。

:::tip  注意
复杂应用程序崩溃时，可能会生成几十 GB 大小的核心文件。默认情况下，Linux 系统会限制核心文件的大小。如果你想解除限制，可通过命令 ulimit -c unlimited，告诉操作系统不要限制核心文件的大小。
:::

值得一提的是，虽然 CNCF 发布的可观测性白皮书仅提到了 core dump。实际上，重要的 dumps 还有 Heap dump（Java 堆栈在特定时刻的快照）、Thread dump（特定时刻的 Java 线程快照）和 Memory dump（内存快照）等等。

最后，尽管 CNCF 将 dumps 纳入了可观测性体系，但仍有许多技术难题，如容器配置与操作系统全局配置的冲突、数据持久化的挑战（Pod 重启前将数 Gb 的 core 文件写入持久卷）等等，导致处理 dumps 数据还得依靠传统手段。