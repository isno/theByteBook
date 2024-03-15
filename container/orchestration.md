# 7.2 以容器构建系统

许多人把容器跟虚拟机相比，把容器当做性能更好的虚拟机，可是无论从原理或者使用方法、特性、功能等比较，两者都没有任何相似之处。
，也没有一种普适的方法把虚拟机里面的应用无缝地迁移到容器中。

“上云” 还是先要深入理解容器的本质是什么。如此，容器就不再是一个无从下手的黑盒，排查线上疑难杂症时也会更有方向。

## 容器的本质是隔离的进程

那么，容器是本质什么呢？其实本质就是个特殊的进程。

特殊之处在于容器利用 Linux namespaces 技术对进程的资源视图进行隔离，使用 cgroups 技术对进程使用的资源进行限制。这样，对进程而言仿佛独立占整个操作系统，拥有整个全局资源。

:::tip Namespace(名称空间)

Linux namespaces 是由内核直接提供的全局资源封装，针对进程设计的访问隔离机制。早期提出以及使用要追溯到贝尔实验室开发的一个名叫 Plan 9 的分布式操作系统。最初的目的是为了实现文件的隔离（即 chroot），并非为了容器而设计。

后来 FreeBSD jails 将这个理念扩展到了对其他 namespaces（例如 PID）的隔离。最后 Linux 吸收了这些理念，从 2.4.19 引入了 Mount 名称空间，陆续添加了 UTS、IPC、PID、Network、User 等名称空间，成为集大成者。
:::

表 7-1 Linux 目前支持的八类名称空间

| 名称空间 | 隔离内容 | 内核版本|
|:--|:--|:--|
| Mount| 隔离文件系统  | 2.4.19 |
| IPC| 隔离进程间通信，使进程拥有独立消息队列、共享内存和信号量 | 2.6.19|
| UTS| 隔离主机的 Hostname、Domain names | 2.6.19 |
| PID| 隔离进程号，名称空间下的进程拥有独立的编号 | 2.6.24 |
| Network| 隔离网络资源，进程拥有单独的端口、协议栈、网络设备等 | 2.6.29 |
| User| 隔离用户和用户组 | 3.8 |
| Cgroup| 使进程拥有一个独立的 cgroup 控制组 | 4.6 |
| Time| 隔离系统时间 | 5.6 |

名称空间使用的方式是通过系统调用，我们创建进程通常使用 fork()，但 fork 背后调用的是 clone()，clone 暴露的参数更多，它的函数定义如下。
```
int clone(int (*fn)(void *), void *child_stack,
         int flags, void *arg, ...
         /* pid_t *ptid, struct user_desc *tls, pid_t *ctid */ );
```

创建的子进程如果想要 mount 自己的根目录、设置自己的 hostname 以及做其他一些事情，就需要通过 flags 参数指定各类名称空间。

如下代码，创建一个新的子进程。

```
int flags = CLONE_NEWNS | CLONE_NEWPID | CLONE_NEWIPC | CLONE_NEWNET | CLONE_NEWUTS;
int pid = clone(main_function, stack_size, flags | SIGCHLD, NULL); 
```

新创建的这个进程将会“看到”一个全新的进程空间，在这个进程空间里，它的 PID 是 1，只能看到各自 Mount 名称空间里挂载的目录和文件，只能访问到各自 Network 名称空间里的网络设备。

进程的资源视图隔离已经完成，如果再对使用资源进行额度限制，那么就能对进程的运行环境实现一个进乎完美的隔离。这就要用 Linux 内核的第二项技术： Linux Control Cgroup，即 cgroups。

:::tip cgroups

cgroups 是一种内核级别的资源管理机制，最早由 Google 工程师在 2007年提出，它主要的作用就是限制一个进程组所使用的资源上限。

Linux 系统中，cgroups 通过内核文件系统操作接口暴露出来，可以通过 /sys/fs/cgroup 查看系统支持的被限制的资源种类。
:::

设置 cgroups 的逻辑比较简单，基本上就是创建 cgroup 目录， 以及往 cgroups 配置文件写入配置。

```
/sys/fs/cgroup/memory/$hostname/memory.limit_in_bytes=1GB // 容器进程及其子进程使用的总内存不超过 1GB
/sys/fs/cgroup/cpu/$hostname/cpu.shares=256 // CPU 总 slice 是 1024，因此限制进程最多只能占用 1/4 CPU 时间
```

由此可见，容器不是轻量化的虚拟机，也没有创造出真正的沙盒（容器之间共享系统内核，这也是为什么又出现了 kata、gVisor 等内核隔离的沙盒容器），只是使用了名称空间、cgroups 等技术进行资源隔离、限制的特殊进程。

## 容器编排的第一个扩展是进程组

既然容器是个特殊的进程，那联想到真正的操作系统内大部分的进程也并非独自运行，而是以进程组有原则的组织在一起，共同协作完成某项工作。

登录到一台 Linux 机器，展示当前系统中正在运行的进程树状结构，执行如下命令：

```
$ pstree -g
    |-rsyslogd(1089)-+-{in:imklog}(1089)
    |  |-{in:imuxsock) S 1(1089)
    | `-{rs:main Q:Reg}(1089)
```
如上，是 Linux 系统中负责处理日志的 rsyslogd 程序。可见 rsyslogd 的主程序 main 以及它要用到的内核日志模块 imklog 等同属 1089 进程组。这些进程相互协作，共享 rsyslogd 程序的资源，共同完成 rsyslogd 程序的职责。

对操作系统而言进程组更方便管理。Linux 操作系统只需将信号（如 SIGKILL）发给一个进程组，该进程组中的所有进程就都会收到这个信号而终止运行。

那么，现在思考一个问题：如果把上面的进程用容器改造跑起来，该如何设计？

如果是使用 Docker，自然会想到启动一个 Docker 容器，里面运行两个进程：rsyslogd 执行业务、imklog 处理业务日志。可是这样设计会有一个问题：**容器里面 PID=1 的进程该是谁**？这个问题的核心在于 **Docker 容器的设计本身是一种“单进程”模型**，Docker 只能通过监视 PID 为 1 的进程的运行状态来判断容器的工作状态是否正常。

如果容器想要实现类似操作系统进程组那般互相协作，容器下一步的演进就是要找到与“进程组”相对应的概念，这是实现容器从隔离到协作的第一步。

## 超亲密容器组

Kubernetes 中这个设计叫做 Pod，Pod 是一组紧密关联的容器集合，它们共享 IPC、Network、UTS 等名称空间，是 Kubernetes 调度的基本单位。

容器之间原本是被 Linux Namespace 和 cgroups 隔开的，Pod 第一个要解决的问题是怎么去打破这个隔离，让 Pod 内的容器可以像进程组一样天然的共享资源和数据。

Kubernetes 中使用了一个特殊的容器（Infra Container）解决这个了问题。Infra Container 是整个 Pod 中第一个启动的容器，只有几百 KB 大小，它负责申请容器组的 UTS、IPC、网络等名称空间，Pod 内其他容器通过 setns（Linux 系统调用，把进程加入到某个名称空间中）方式共享 Infra Container 容器的命名空间。

:::tip 额外知识
Infra Container 启动之后，永远处于 Pause 状态，所以也常被称为“pause 容器”。
默认情况下 infra 镜像的地址为 k8s.grc.io/pause.3.5，很多时候我们部署应用一直处于 Pending状态 ，大部分原因就是这个镜像地址在国内无法访问造成。
:::

<div  align="center">
  <img src="../assets/infra-container.svg" width = "350"  align=center />
  <p>图 Kubernetes 架构</p>
</div>

此时，同一 Pod 内的容器共享以下名称空间：

- **UTS 名称空间**：所有容器都有相同的主机名和域名。
- **网络名称空间**：所有容器都共享一样的网卡、网络栈、IP 地址等。同一个 Pod 中不同容器占用的端口不能冲突（这也是 Kubernetes 中 endpoint 的由来）。
- **IPC 名称空间**：所有容器都可以通过信号量或者 POSIX 共享内存等方式通信。
- **时间名称空间**：所有容器都共享相同的系统时间。

不过 PID 名称空间和文件名称空间默认还是隔离的，这是因为容器之间也需要相互独立的文件系统以避免冲突。如果容器之间想要想要实现文件共享，使用共享存储卷即可，这也是 Kubernetes Volume 的由来。

PID 的隔离令每个容器都有独立的进程 ID 编号，如果要共享 PID 名称空间，需要设置 PodSpec 中的 ShareProcessNamespace 为 true，如下所示。
```
spec:
  shareProcessNamespace: true
```

## Pod 是原子调度单位

Pod 承担的另外一个重要职责是 - 作为调度的原子单位。

协同调度是非常麻烦的事情，举个例子说明，假如有两个亲和性容器：第一个容器 Nginx（资源需求 1G 内存） 接收请求，并将请求写入日志文件，第二个容器 LogCollector（资源需求 0.5 G 内存），它会把 Nginx 容器写的日志文件转发到后端的 ElasticSearch 中。

当前集群环境的可用内存是这样一个情况：Node1 1.25G 内存，Node2 2G 内存。

假如现在没有 Pod 概念，就只有两个亲密协同的容器，它们需要运行在一台机器上。如果调度器先把 Nginx 调度到了 Node1 上面，LogCollector 实际上是没办法调度到 Node1 上的，因为资源不够，这一轮的调度失败，需要重新再发起调度。假如有几十台 Node，数百个、数千个容器，要避免系统因为外部流量压力、代码缺陷、软件更新等等原因出现的中断，那么编排系统该如何高效的运作呢？

有两个比较典型的方案：

- 前面提到的 Mesos 系统中，它会先做资源囤积（resource hoarding），当所有设置了亲和性约束的任务都达到时，才开始统一调度，这是一个非常典型的成组调度的解法。这样也会带来新的问题，调度效率会损失，互相等待还有可能产生死锁。
- 另一个做法是 Google Omega 系统中的做法，他们在论文《Omega: Flexible, Scalable Schedulers for Large Compute Clusters》[^1] 中介绍了如何使用通过乐观并发（Optimistic Concurrency）、冲突回滚的方式做到高效率，但方案无疑非常复杂。

将运行资源的需求声明定义在 Pod 上，直接以 Pod 为最小的原子单位来实现调度的话，Pod 与 Pod 之间也不存在什么超亲密关系（非亲密关系的容器在不同的 Pod 内，通过网络联系），复杂的协同调度设计在 Kubernetes 中直接消失了。

## 容器的设计模式 Sidecar

通过组合两个不同角色的容器，共享资源，统一调度编排，像这样的一个概念，在 Kubernetes 里面就是一个非常经典的容器设计模式，叫做：“Sidecar”。

什么是 Sidecar？就是说其实在 Pod 里面，可以定义一些专门的容器，来执行主业务容器所需要的一些辅助工作，比如我们前面举的例子，LogCollector 就是 sidecar。

sidecar 设计模式允许你为你的应用程序增加一些功能，而不需要为第三方组件增加配置代码。

## Kubernetes 系统架构

此刻，我们概览 Kubernetes 的整个架构设计，如下图所示，架构由两部分组成：管理者被称为 Control Plane（控制平面，按照习惯称呼 Master 节点也没问题 ）、被管理者称为 Node（Work 节点）。

<div  align="center">
	<img src="../assets/k8s.png" width = "650"  align=center />
	<p>图 Kubernetes 架构</p>
</div>

Control Plane 是集群管理者，在逻辑上只有一个，它对 Node 节点进行统一管理，调度资源并操作 Pod，目标就是使得用户创建的各种 Kubernetes 对象按照其配置所描述的状态运行。它包含如下组件：

- API Server： 操作 Kubernetes 各个资源的应用接口。并提供认证、授权、访问控制、API 注册和发现等机制。
- Scheduler（调度器）：负责调度 Pod 到合适的 Node 上。例如，通过 API Server 创建 Pod 后，Scheduler 将按照调度策略寻找一个合适的 Node。
- Controller Manager（集群控制器）：负责执行对集群的管理操作。例如，按照预期增加或者删除 Pod。

Node 通常也被称为工作节点，可以有多个，资源提供者，用于运行 Pod 并根据 Control Plane 的命令管理各个 Pod，它包含如下组件：

- Kubelet 是 Kubernetes 在 Node 节点上运行的代理，负责所在 Node 上 Pod 创建、销毁等整个生命周期的管理。
- Kube-proxy 在 Kubernetes 中，将一组特定的 Pod 抽象为 Service，Kube-proxy 通过维护节点上的网络规则，为 Service 提供集群内服务发现和负载均衡功能。
- Container runtime (容器运行时)：负责 Pod 和 内部容器的运行。在第七章已经介绍过各类容器运行时，Kubernetes 支持多种容器运行时，如 containerd、Docker 等。

[^1]: 参见 https://static.googleusercontent.com/media/research.google.com/zh-CN//pubs/archive/41684.pdf