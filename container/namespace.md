# 7.2.1 Namespace

Namespace 是 Linux 内核中实现的特性，本质上是一种资源隔离方案。

Namespace，顾名思义，为不同的进程集合提供不同的`命名空间`，不同进程集合彼此不能访问其对应的`命名空间`，而`命名空间`其实就是其资源集合。Namespace 提供了一种抽象机制，将原本全局共享的资源隔离成不同的集合，集合中的成员独享其原本全局共享的资源。

举个例子：进程 A 和进程 B 分别属于两个不同的 Namespace，那么进程 A 将可以使用 Linux 内核提供的所有 Namespace 资源：如独立的主机名，独立的文件系统，独立的进程编号等等。同样地，进程 B 也可以使用同类资源，但其资源与进程 A 使用的资源相互隔离，彼此无法感知。从用户层面来看，进程 A 读写属于 A 的 Namespace 资源，进程 B 读写属于 B 的 Namespace 资源，彼此之间安全隔离。


Docker、Kubernetes 就是利用 Namespace 这个特性，实现了容器之间的资源隔离，毫不夸张地说 namespace 是整个 Linux 网络虚拟化，甚至更进一步也可以说是前云计算潮流的基石。

Linux 通过对内核资源进行封装抽象，提供了八类系统资源的隔离机制（namespace）：

|  类型   | 用途  |
|  ----  | ----  |
| Cgroup  | Cgroup root directory cgroup 根目录 |
| IPC  | System V IPC, POSIX message queues信号量，消息队列 |
| Network  | Network devices, stacks, ports, etc.网络设备，协议栈，端口等等 |
| Mount  | Mount points挂载点 |
| PID  | Process IDs进程号 |
| User  | 用户和组 ID |
| UTS  | 系统主机名和 NIS(Network Information Service) 主机名（有时称为域名） |
| Time  | 时钟 |