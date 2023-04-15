# 网络虚拟化

Container技术、Kubernetes等各类云原生应用是以虚拟化为基础，通过软硬件解耦及功能抽象从而实现按需、弹性和可扩展的计算服务。而虚拟化的底层是Linux namespace，了解 namespace 以及网络虚拟化技术，面对容器网络、云原生架构等疑难杂陈方能知其理得其法。


## Linux namespace 

Linux 内核实现 namespace 的一个主要目的是用来隔离内核资源，实现轻量级虚拟化(容器)服务。

在同一个 namespace 下的进程可以感知彼此的变化，而对外界的进程一无所知，这样就可以让容器中的进程置身于一个独立的系统中，从而达到隔离的目的。

容器就是采用namespace机制实现了对网络，进程空间等的隔离。不同的Container、Pod 属于不同namespace，实现了Container或Pod之间的资源互相隔离，互不影响。毫不夸张地说 namespace 是整个Linux网络虚拟化，甚至更进一步也可以说是前云计算潮流的基石。


Linux通过对内核资源进行封装抽象，提供了七类系统资源的隔离机制（namespace）：

|  类型   | 用途  |
|  ----  | ----  |
| Cgroup  | Cgroup root directory |
| IPC  | System V IPC, POSIX message queues |
| Network  | Network devices, stacks, ports, etc. |
| Mount  | Mount points |
| PID  | Process IDs |
| User  | User and group IDs |
| UTS  | Hostname and NIS domain name |


> Cgroup 是对硬件资源隔离和虚拟技术，将在云原生篇节讲解


网络虚拟化的主要技术是 Network namespace，以及各类虚拟设备：Veth（虚拟网卡）、Linux Bridge（虚拟网桥）、tap/tun（隧道通信）。


