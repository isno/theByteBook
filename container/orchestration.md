# 7.2 容器技术的原理与演进

字面上，“容器”这个词难以让人形象地理解真正含义，Kubernetes 中最核心的概念“Pod”也是如此。

几句简单的解释无法充分理解这些概念，甚至引起误解！例如，业内常常将容器和轻量级虚拟机混为一谈，如果容器类似虚拟机，那应该存在一种普适的方法，能够无缝地将虚拟机内的应用程序迁移至容器中，但现实中并不存在这种方法，还是要大量的适配、改造工作。

本节，笔者将从文件系统隔离的起源出发，逐步讲解容器技术的演进过程，帮助你深入理解 Kubernetes 核心概念 Pod 的设计背景与应用。

## 7.2.1 文件系统隔离

容器的起源可以追溯到 1979 年 UNIX 系统中引入的 chroot 命令[^1]。

chroot 是“change root”的缩写，它允许管理员将进程的根目录锁定在特定位置，从而限制进程对文件系统的访问范围。chroot 的隔离功能对安全性至关重要。例如，可以创建一个“蜜罐”，用来安全地运行和监控可疑代码或程序。因此，chroot 环境也被形象地称为“jail”（监狱），而突破 chroot 的过程则被称为“越狱”。

时至今日，chroot 命令仍然活跃于主流的 Linux 系统中。在绝大部分 Linux 系统中，只需几步操作，就可以为进程创建一个文件隔离环境。

```bash
$ mkdir -p new-root/{bin,lib64,root}
$ cp /bin/bash new-root/bin
$ cp /lib64/{ld-linux-x86-64.so*,libc.so*,libdl.so.2,libreadline.so*,libtinfo.so*} new-root/lib64
$ sudo chroot new-root
```
尽管这个隔离环境功能有限，仅提供了 bash 和一些内置函数，但足以说明它的作用：“运行在 new-root 根目录下的进程，其文件系统与宿主机隔离了”。

```bash
bash-4.2# cd bin 
bash-4.2# pwd
/bin
```
:::tip 额外知识

除了 /bin 之外，如果我们将程序依赖的 /etc、/proc 等目录一同打包进去，实际上就得到了一个 rootfs 文件。因为 rootfs 包含的不仅是应用，还有整个操作系统的文件和目录，这意味着应用及其所有依赖都被封装在一起，这正是容器被广泛宣传为一致性解决方案的由来。
:::

我们再运行一个 docker 容器，观察两者之间的区别。

```bash
$ docker run -t -i ubuntu:18.04 /bin/bash

root@028f46a5b7db:/# cd bin
root@028f46a5b7db:/bin# pwd
/bin
```
虽然 chroot 看起来与容器相似，都是创建与宿主机隔离的文件系统环境，但这并不意味着 chroot 就是容器。

chroot 只是改变了进程的根目录，并未创建真正独立、安全的隔离环境。在 Linux 系统中，从低层次的资源（如网络、磁盘、内存、处理器）到操作系统控制的高层次资源（如 UNIX 分时、进程 ID、用户 ID、进程间通信），都存在大量非文件暴露的操作入口。

因此，无论是 chroot，还是针对 chroot 安全问题改进后的 pivot_root，都无法实现对资源的完美隔离。

## 7.2.2 资源全方位隔离

chroot 最初的目的是为了实现文件系统的隔离，并非专门为容器设计。

后来 Linux 吸收了 chroot 的设计理念，先是在 2.4.19 引入了 Mount 命名空间，这样就可以隔离挂载文件系统。又想到进程间通信也需要隔离，就有了 IPC（Process ID）命名空间。同时，容器还需要一个独立的主机名以便在网络中标识自己，于是有了 UTS（UNIX Time-Sharing）命名空间。有了独立的主机名，自然要有配套的 IP、端口、路由等，于是 Network 命名空间应用而生。

自 Linux 内核 2.6.19 起，逐步引入了 UTS、IPC、PID、Network 和 User 等命名空间功能。到 3.8 版本，Linux 实现了容器所需的六项核心资源隔离机制。

:::center
表 7-1 Linux 系统目前支持的八类命名空间（Linux 4.6 版本起，新增了 Cgroup 和 Time 命名空间）
:::

| 命名空间 | 隔离的资源 | 内核版本|
|:--|:--|:--|
| Mount| 隔离文件系统挂载点，功能大致类似 chroot | 2.4.19 |
| IPC| 隔离进程间通信，使进程拥有独立消息队列、共享内存和信号量 | 2.6.19|
| UTS| 隔离主机的 Hostname、Domain names，这样容器就可以拥有独立的主机名和域名，在网络中可以被视作一个独立的节点。 | 2.6.19 |
| PID| 隔离进程号，对进程 PID 重新编码，不同命名空间下的进程可以有相同的 PID | 2.6.24 |
| Network| 隔离网络资源，包括网络设备、协议栈（IPv4、IPv6）、IP 路由表、iptables、套接字（socket）等 | 2.6.29 |
| User| 隔离用户和用户组 | 3.8 |
| Cgroup| 使进程拥有一个独立的 cgroup 控制组。cgroup 非常重要，稍后笔者详细介绍。 | 4.6 |
| Time| 隔离系统时间，Linux 5.6 内核版本起支持进程独立设置系统时间 | 5.6 |

在 Linux 中，为进程设置各种命名空间非常简单，只需通过系统调用函数 clone 并指定相应的 flags 参数即可。

```c
int clone(int (*fn)(void *), void *child_stack,
         int flags, void *arg, ...
         /* pid_t *ptid, struct user_desc *tls, pid_t *ctid */ );
```

如下代码所示，通过调用 clone 函数并指定相应的 flags 参数创建一个子进程。新创建的子进程将“看到”一个全新的系统环境，所有的资源，包括进程挂载的文件目录、进程 PID、进程间通信资源、网络及网络设备、UTS 等，都将与宿主机隔离。

```c
int flags = CLONE_NEWNS | CLONE_NEWPID | CLONE_NEWIPC | CLONE_NEWNET | CLONE_NEWUTS;
int pid = clone(main_function, stack_size, flags | SIGCHLD, NULL); 
```

## 7.2.3 资源全方位限制

进程的资源隔离已经完成，如果再对使用资源进行额度限制，就能对进程的运行环境实现“进乎完美”的隔离。这就要用 Linux 内核的第二项技术 —— Linux Control Cgroup（Linux 控制组群，简称 cgroups）。

cgroups 是 Linux 内核用于隔离、分配并限制进程组使用资源配额的机制。例如，它可以控制进程的 CPU 占用时间、内存大小、磁盘 I/O 速度等。该项目最初由 Google 工程师 Paul Menage 和 Rohit Seth 于 2000 年发起，当时称之为“进程容器”（Process Container）。由于“容器”这一名词在 Linux 内核中有不同含义，为避免混淆，最终将其重命名为 cgroups。

2008 年，cgroups 被合并到 Linux 内核 2.6.24 版本中，标志着第一代 cgroups 的发布。2016 年 3 月，Linux 内核 4.5 引入了由 Facebook 工程师 Tejun Heo 重写的第二代 cgroups。相比第一代，第二代提供了更加统一的资源控制接口，使得对 CPU、内存、I/O 等资源的限制更加一致。不过，考虑兼容性和稳定性，大多数容器运行时（container runtime）目前仍默认使用第一代 cgroups。

在 Linux 系统中，cgroups 通过文件系统向用户暴露其操作接口。这些接口以文件和目录的形式组织在 /sys/fs/cgroup 路径下。

在 Linux 中执行 ls /sys/fs/cgroup 命令，可以看到在该路径下有许多子目录，如 blkio、cpu、memory 等。

```bash
$ ll /sys/fs/cgroup
总用量 0
drwxr-xr-x 2 root root  0 2月  17 2023 blkio
lrwxrwxrwx 1 root root 11 2月  17 2023 cpu -> cpu,cpuacct
lrwxrwxrwx 1 root root 11 2月  17 2023 cpuacct -> cpu,cpuacct
drwxr-xr-x 3 root root  0 2月  17 2023 memory
...
```
在 cgroups 中，每个子目录被称为“控制组子系统”（control group subsystems），它们对应于不同类型的资源限制。每个子系统有多个配置文件，比如内存子系统：

```bash
$ ls /sys/fs/cgroup/memory
cgroup.clone_children               memory.memsw.failcnt
cgroup.event_control                memory.memsw.limit_in_bytes
cgroup.procs                        memory.memsw.max_usage_in_bytes
cgroup.sane_behavior                memory.memsw.usage_in_bytes
```
这些文件各自用于不同的功能。例如，memory.kmem.limit_in_bytes 用于限制应用程序的总内存使用；memory.stat 用于统计内存使用情况；memory.failcnt 文件报告内存使用达到了 memory.limit_in_bytes 限制值的次数等。

目前，主流的 Linux 系统支持的控制组子系统如表 7-2 所示。

:::center
表 7-2 cgroups 控制组群子系统
:::
| 控制组群子系统 | 功能|
|:--|:--|
|blkio | 控制并监控 cgroup 中的任务对块设备(例如磁盘、USB 等) I/O 的存取 |
| cpu | 控制 cgroups 中进程的 CPU 占用率 |
|cpuacct| 自动生成报告来显示 cgroup 中的进程所使用的 CPU 资源 |
| cpuset| 可以为 cgroups 中的进程分配独立 CPU 和内存节点 |
|devices | 控制 cgroups 中进程对某个设备的访问权限|
|freezer | 暂停或者恢复 cgroup 中的任务 |
| memory | 自动生成 cgroup 任务使用内存资源的报告，并限定这些任务所用内存的大小 |
|net_cls | 使用等级识别符（classid）标记网络数据包，这让 Linux 流量管控器（tc）可以识别从特定 cgroup 中生成的数据包 ，可配置流量管控器，让其为不同 cgroup 中的数据包设定不同的优先级|
| net_prio | 可以为各个 cgroup 中的应用程序动态配置每个网络接口的流量优先级 |
|perf_event | 允许使用 perf 工具对 crgoups 中的进程和线程监控|

Linux cgroups 的设计简洁易用。在 Docker 等容器系统中，只需为每个容器在每个子系统下创建一个控制组（通过创建目录），然后在容器进程启动后，将进程的 PID 写入相应子系统的 tasks 文件。

如下面的代码所示，我们创建了一个内存控制组子系统（目录名为 $hostname），并将 PID 为 3892 的进程的内存限制为 1 GB，同时限制其 CPU 使用时间为 1/4。

```bash
/sys/fs/cgroup/memory/$hostname/memory.limit_in_bytes=1GB // 容器进程及其子进程使用的总内存不超过 1GB
/sys/fs/cgroup/cpu/$hostname/cpu.shares=256 // CPU 时间总数为 1024，设置 256 后，限制进程最多只能占用 1/4 CPU 时间

echo 3892 > /sys/fs/cgroup/cpu/$hostname/tasks 
```

值得补充的是，cgroups 在资源限制方面仍有不完善之处。例如，/proc 文件系统记录了进程对 CPU、内存等资源的占用情况，这些数据是 top 命令查看系统信息的主要来源。然而，/proc 文件系统并未关联 cgroups 对进程的限制。因此，当在容器内部执行 top 命令时，显示的是宿主机的资源占用状态，而不是容器内的状态。为了解决这个问题，业内通常采用 LXCFS（LXC 用的 FUSE 文件系统）技术，维护一套专门用于容器的 /proc 文件系统，从而准确反映容器内的资源使用情况。

至此，相信读者已经理解容器的概念。容器并不是轻量化的虚拟机，也不是一个完全的沙盒（容器共享宿主机内核，实现的是一种“软隔离”）。本质上，容器是通过命名空间、cgroups 等技术实现资源隔离和限制，并拥有独立根目录（rootfs）的特殊进程。


## 7.2.4 设计容器协作的方式

既然容器是个特殊的进程，那联想到真正的操作系统内大部分进程也并非独自运行，而是以进程组的形式被有序地组织和协作，完成特定任务。

例如，登录到 Linux 机器后，执行 pstree -g 命令可以查看当前系统中的进程树状结构。

```bash
$ pstree -g
    |-rsyslogd(1089)-+-{in:imklog}(1089)
    |  |-{in:imuxsock) S 1(1089)
    | `-{rs:main Q:Reg}(1089)
```
如命令输出所示，rsyslogd 程序的进程树结构展示了其主程序 main 和内核日志模块 imklog 都属于进程组 1089。它们共享资源，共同完成 rsyslogd 的任务。对于操作系统而言，这种进程组管理更加方便。比如，Linux 操作系统可以通过向一个进程组发送信号（如 SIGKILL），使该进程组中的所有进程同时终止运行。

现在，假设我们要将上述进程用容器改造，该如何设计呢？如果使用 Docker，通常会想到在容器内运行两个进程：
- rsyslogd 负责业务逻辑；
- imklog 处理日志。

但这种设计会遇到一个问题：容器中的 PID=1 进程应该是谁？在 Linux 系统中，PID 为 1 的进程是 init，它作为所有其他进程的祖先进程，负责监控进程状态，并处理孤儿进程。因此，容器中的第一个进程也需要具备类似的功能，能够处理 SIGTERM、SIGINT 等信号，优雅地终止容器内的其他进程。

Docker 的设计核心在于采用的是“单进程”模型。Docker 通过监控 PID 为 1 的进程的状态来判断容器的健康状态（在 Dockerfile 中用 ENTRYPOINT 指定启动的进程）。如果确实需要在一个 Docker 容器中运行多个进程，首个启动的进程应该具备资源监控和管理能力，例如，使用专为容器开发的 tinit 程序。

虽然通过 Docker 可以勉强实现容器内运行多个进程，但进程间的协作远不止于资源回收那么简单。要让容器像操作系统中的进程组一样进行协作，下一步的演进是找到类似“进程组”的概念。这是实现容器从“隔离”到“协作”的第一步。

## 7.2.5 超亲密容器组 Pod

在 Kubernetes 中，与“进程组”对应的设计概念是 Pod。Pod 是一组紧密关联的容器集合，它们共享 IPC、Network 和 UTS 等命名空间，是 Kubernetes 管理的最基本单位。

容器之间原本通过命名空间和 cgroups 进行隔离，Pod 的设计目标是打破这种隔离，使 Pod 内的容器能够像进程组一样共享资源和数据。为实现这一点，Kubernetes 引入了一个特殊容器 —— Infra Container。

Infra Container 是 Pod 内第一个启动的容器，体积非常小（约 300 KB）。它主要负责为 Pod 内的容器申请共享的 UTS、IPC 和网络等命名空间。Pod 内的其他容器通过 setns（Linux 系统调用，用于将进程加入指定命名空间）来共享 Infra Container 的命名空间。此外，Infra Container 也可以作为 init 进程，管理子进程和回收资源。

:::tip 额外知识
Infra Container 启动后，执行一个永远循环的 pause() 方法，因此又被称为“pause 容器”。
:::

:::center
  ![](../assets/infra-container.svg) <br/>
  图 7-4 Pod 内的容器通过 Infra Container 共享网络命名空间
:::

通过 Infra Container，Pod 内的容器可以共享 UTS、Network、IPC 和 Time 命名空间。不过，PID 命名空间和文件系统命名空间默认依然是隔离的，原因如下：

- **文件系统隔离**：容器需要独立的文件系统，以避免冲突。如果容器之间需要共享文件，Kubernetes 提供了 Volume 支持（将在本章 7.5 节中介绍）；
- **PID 隔离**：PID 命名空间隔离是为了避免某些容器进程没有 PID=1 的问题，这可能导致容器启动失败（例如，使用 systemd 的容器）。

如果需要共享 PID 命名空间，可以在 Pod 声明中设置 shareProcessNamespace: true。Pod 的 YAML 配置如下所示：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example-pod
spec:
  shareProcessNamespace: true
  containers:
    - name: container1
      image: myimage1
    ...
```

在共享 PID 命名空间的 Pod 中，Infra Container 将承担 PID=1 进程的职责，负责处理信号和回收子进程资源等操作。

## 7.2.6 Pod 是 Kubernetes 的基本单位

解决了容器的资源隔离、限制以及容器间协作问题，Kubernetes 的功能开始围绕容器和 Pod 不断向实际应用的场景扩展。

由于一个 Pod 不会仅有一个实例，Kubernetes 引入了更高层次的抽象来管理多个 Pod 实例。例如：
- **Deployment**：用于管理无状态应用，支持滚动更新和扩缩容；
- **StatefulSet**：用于管理有状态应用，确保 Pods 的顺序和持久性；
- **DaemonSet**：确保每个节点上运行一个 Pod，常用于集群管理或监控；
- **ReplicaSet**：确保指定数量的 Pod 副本处于运行状态；
- **Job/CronJob**：管理一次性任务或定期任务。

鉴于 Pod 的 IP 地址是动态分配的，Kubernetes 引入了 Service 来提供稳定的网络访问入口并实现负载均衡。此外，Ingress 作为反向代理，根据定义的规则将流量路由至后端的 Service 或 Pod，从而实现基于域名或路径的细粒度路由和更复杂的流量管理。围绕 Pod 的设计不断衍生，最终绘制出图 7-5 所示的 Kubernetes 核心功能全景图。

:::center
  ![](../assets/pod.svg)<br/>
  图 7-5 Kubernetes 核心功能全景图
:::

## 7.2.7 Pod 是调度的原子单位

Pod 承担的另一个重要职责是作为调度的原子单位。

调度（特别是协同调度）是非常麻烦的事情。举个例子，假设有两个具有亲和性的容器：
- Nginx（资源需求：1GB 内存），负责接收请求并将其写入主机的日志文件；
- LogCollector（资源需求：0.5GB 内存），负责读取日志并将其转发到 Elasticsearch 集群。

假设当前集群的资源情况如下：

- Node1：1.25G 可用内存；
- Node2：2G 可用内存。

如果这两个容器必须协作并在同一台机器上运行，调度器可能会将 Nginx 调度到 Node1。然而，Node1 上只有 1.25GB 内存，而 Nginx 占用了 1GB，导致 LogCollector 无法在该节点上运行，从而阻塞了调度。尽管重新调度可以解决这个问题，但如果需要协调数以万计的容器呢？以下是两种典型的解决方案：

- **成组调度**：集群等到足够的资源满足容器需求后，统一调度。这种方法可能导致调度效率降低、资源利用不足，并可能出现互相等待而导致死锁的问题；
- **提高单个调度效率**：
通过提升单任务调度效率解决。像 Google 的 Omega 系统采用了基于共享状态的乐观绑定（Optimistic Binding）来优化大规模调度效率。但这种方案实现起来较为复杂，笔者将在第 7.7.3 节“调度器及扩展设计”中详细探讨。

在 Pod 上直接声明资源需求，并以 Pod 作为原子单位来实现调度，Pod 与 Pod 之间不存在超亲密的关系，如果有关系，就通过网络通信实现关联。复杂的协同调度问题在 Kubernetes 中直接消失了！

## 7.2.8 容器边车模式

组合多种不同角色的容器，共享资源并统一调度编排，在 Kubernetes 中是一种经典的容器设计模式 —— 边车（Sidecar）模式。

如图 7-6 所示，在边车模式下，一个主容器（负责业务逻辑处理）与一个或多个边车容器共同运行在同一个 Pod 内。边车容器负责处理非业务逻辑的任务，如日志记录、监控、安全保障或数据同步。边车容器将这些职能从主业务容器中分离，使得开发更加高内聚、低耦合的软件变得更加容易。

:::center
  ![](../assets/sidecar.svg)<br/>
  图 7-6 容器 Sidecar 设计模式
:::

在本书第 8 章《服务网格技术》中，笔者将以代理型边车为例，进一步阐述这种设计模式的优点。

[^1]: 在 2000 年，Linux 内核 2.3 版本引入 pivot_root 技术来实现更安全的文件隔离。现如今的容器技术 LXC、Docker 等等都是使用 pivot_root 来实现文件隔离的。
