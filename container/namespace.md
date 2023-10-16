# 7.2.1 Namespace 资源隔离

Linux Namespace 提供了一种内核级别隔离系统资源的方法，通过将系统的全局资源放在不同的 Namespace 中来实现资源隔离的目的。

举例说明：进程 A 和进程 B 分别属于两个不同的 Namespace，进程 A 将可以使用 Linux 内核提供的所有 Namespace 资源：如独立的主机名，独立的文件系统，独立的进程编号等等。同样进程 B 也可以使用同类资源，但其资源与进程 A 使用的资源相互隔离，彼此无法感知。从用户层面来看，进程 A 读写属于 A 的 Namespace 资源，进程 B 读写属于 B 的 Namespace 资源，彼此之间安全隔离。


各类的容器技术利用 Linux Namespace 特性，实现了容器之间资源隔离。毫不夸张地说 namespace 是整个 Linux 虚拟化，甚至更进一步也可以说是前云计算潮流的基石。

Linux 通过对内核资源进行封装抽象，提供了八类系统资源的隔离（Namespace）：

|  类型   | 用途  |
|  ----  | ----  |
| Cgroup  | Cgroup root directory cgroup 根目录 |
| IPC  | System V IPC, POSIX message queues 信号量，消息队列 |
| Network  | Network devices, stacks, ports, etc.网络设备，协议栈，端口等等 |
| Mount  | Mount points 挂载点 |
| PID  | Process IDs 进程号 |
| User  | 用户和组 ID |
| UTS  | 系统主机名和 NIS(Network Information Service) 主机名（有时称为域名） |
| Time  | 时钟 |