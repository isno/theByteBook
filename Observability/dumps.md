# 9.3.5 dumps

CNCF 可观测性白皮书中只提到了 core dump。不过 dumps 还应该包如 Heap dump（某时刻 Java 堆栈的快照）、Thread dump（某一时刻 Java 线程快照）等。

core dump 历史悠久，很早就出现在 Unix-like 系统中，在一个任何安装有《Linux man 手册》的 Linux 发行版上，都可以通过 man core 来查阅相关信息。

```
$ man core
...
A small number of signals which cause abnormal termination of a process
     also cause a record of the process's in-core state to be written to disk
     for later examination by one of the available debuggers.  (See
     sigaction(2).)
...
```

根据上面的解释，只要程序异常终止或者崩溃系统就会有选择的将运行中的状态保存在一个文件中，core 的意思是内存，dump 的意思是扔出来，这个文件就称为 core dump 文件。除了内存信息外，关键的程序运行状态也会 dump 下来，例如寄存器信息（程序指针、栈指针）、内存管理信息、其他处理器和操作系统状态等信息。

core dump 主要用来分析程序运行到底是哪出错了，最典型的使用是结合 gdb 分析引发程序崩溃的问题。由于 core dump 文件会占据大量的磁盘空间（处理密集型的应用程序可能会生成两位数 Gb 大小的文件），默认情况下，Linux 不允许生成 core dump 文件，得通过命令 ulimit -c unlimited（不限制 core 文件大小）开启。


虽然 CNCF 将 dumps 数据纳入了可观测体系，但众多的应用限制：应用和基础设施角色权限（容器应用与系统全局配置问题）、数据持久化的问题（Pod 在重启之前得把 core dump 文件写入持久卷），rangdumps 和 Profiles 并没有像日志、Metrics 产生系统化处理的方案。

虽然早些年 Linux 社区[^1]以及 Docker 社区[^2]也在讨论容器中支持 core_pattern 独立配置，但毕竟分析 dumps 和 Profiles只是个极低概率的工作，所以这些方案和讨论并没有进展，目前还得依靠原始的手段去处理。

[^1]: 参见 https://lore.kernel.org/patchwork/patch/643798/
[^2]: 参见 https://github.com/moby/moby/issues/19289