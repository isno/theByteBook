# 网络虚拟化

容器、Kubernetes 等各类云原生应用本质是以计算机资源虚拟化为基础，通过软硬件解耦及功能抽象从而实现按需、弹性和可扩展的计算服务。而虚拟化底层是 Linux namespace，了解 namespace 以及网络虚拟化技术，应对容器服务、云原生架构等疑难杂陈方能知其理得其法。

## Linux namespace 

Linux 内核实现 namespace 一个主要目是用来隔离内核资源，实现轻量级虚拟化(容器)服务。

在同一个 namespace 下的进程可以感知彼此变化，而对外界的进程一无所知，这样就可以让宿主机内多个容器进程置身于一个独立的系统中，不同的容器、Pod 属于不同 namespace，实现了容器或 Pod 之间资源互相隔离，互不影响。

毫不夸张地说 namespace 是整个 Linux 网络虚拟化，甚至更进一步也可以说是前云计算潮流的基石。

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

网络虚拟化主要技术是 Network namespace，以及各类虚拟设备：Veth（虚拟网卡）、Linux Bridge（虚拟网桥）、tap/tun（隧道通信）。他们之间彼此协作，将独立的 namespace 连接起来形成一个虚拟网络。


