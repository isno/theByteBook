# 7.2 以容器构建系统

许多人把容器跟虚拟机相比，把容器当做性能更好的虚拟机，但是无论从实现原理还是使用方法、特性、功能等比较，容器都与虚拟机没有任何相似之处，也不存在一种普适的方法把虚拟机里面的应用无缝地迁移到容器中。

“上云” 还是先要深入理解容器的本质是什么。

## 容器的本质是隔离的进程

那么，容器是本质什么呢？如果把 Kubernetes 比作云原生时代的操作系统，那么容器就是这个操作系统之内的特殊进程。

特殊之处在于容器利用内核技术对进程的视图进行隔离（使用 namespace 技术），使用的资源进行限制（使用cgroups 技术）。使其仿佛独立占有所有资源，并拥有整个全局资源的假象。

:::tip Namespace(命名空间)

Linux namespaces，由内核直接提供的全局资源封装，针对进程设计的访问隔离机制。

早期提出以及使用要追溯到贝尔实验室开发的一个名叫 Plan 9 的分布式操作系统。最初的目的是为了实现文件的隔离，并非为了容器而设计。最开始 Linux 内核 2.4.19 引入了 Mount ，后来系统其他资源隔离的呼声愈发强烈，Linux 内核从 2.6.19 起陆续添加了 UTS、IPC、PID、Network 等 namespace 隔离功能。到 Linux 3.8，又增加了 User namespace。至此，Docker 以及其他容器技术所用到的 namespace 已全部就绪。
:::

表 7-1 Linux 目前支持的八类命名空间

| 名称空间 | 隔离内容 | 内核版本|
|:--|:--|:--|
| Mount| 隔离文件系统  | 2.4.19 |
| IPC| 隔离进程间通信，使进程拥有独立消息队列、共享内存和信号量 | 2.6.19|
| UTS| 隔离主机的 Hostname、Domain names | 2.6.19 |
| PID| 隔离进程号，名称空间下的进程拥有独立的编号 | 2.6.24 |
| Network| 隔离网络资源，进程拥有单独的端口、socket、网络设备等 | 2.6.29 |
| User| 隔离用户和用户组 | 3.8 |
| Cgroup| 使进程拥有一个独立的 cgroup 控制组 | 4.6 |
| Time| 隔离系统时间 | 5.6 |

使用 Namespace 其实也非常简单，它其实只是 Linux 创建新进程的一个可选参数。比如，在 Linux 系统中创建线程的系统调用是 clone 定义如下。
```
int clone(int (*fn)(void *), void *child_stack,
         int flags, void *arg, ...
         /* pid_t *ptid, struct user_desc *tls, pid_t *ctid */ );
```

其中 flags 参数可指定以上命名空间。而返回值就是新进程的 PID。

创建一个新的进程，指定 flags 参数为 CLONE_NEWPID。

```
int pid = clone(main_function, stack_size, CLONE_NEWPID | SIGCHLD, NULL); 
```

这时，新创建的这个进程将会“看到”一个全新的进程空间，在这个进程空间里，它的 PID 是 1。这些进程就会觉得自己是各自 PID Namespace 里的第 1 号进程，只能看到各自 Mount Namespace 里挂载的目录和文件，只能访问到各自 Network Namespace 里的网络设备，就仿佛运行在一个个“容器”里面，与世隔绝。

进程的视图隔离已经完成，如果再对使用资源进行限制，那么就能对进程的运行环境实现一个进乎完美的隔离。这就要用 Linux 内核的第二项技术： Linux Control Cgroup，即 cgroups。

:::tip cgroups

cgroups 是一种内核级别的资源管理机制，最早由 Google 工程师在 2007年提出，它主要的作用就是限制一个进程组所使用的资源上限。

Linux 系统中，cgroups 通过内核文件系统操作接口暴露出来，通过 /sys/fs/cgroup 查看系统支持的被限制的资源种类。

:::


由此可见，容器不是轻量化的虚拟机，也没有创造出真正的沙盒（容器之间共享系统内核，这也是为什么又出现了 kata、gVisor 等内核隔离的沙盒容器），只是使用了命名空间进行资源隔离、cgroups 进行资源限制的进程。。

## 容器编排的第一个扩展是进程组

在一个真正的操作系统内，大部分的进程也并非独自运行，而是以进程组，有原则的组织在一起，共同协作完成某项工作。

登录到一台 Linux 机器，展示当前系统中正在运行的进程述状结构，执行如下命令：

```
$ pstree -g
    |-rsyslogd(1089)-+-{in:imklog}(1089)
    |  |-{in:imuxsock) S 1(1089)
    | `-{rs:main Q:Reg}(1089)
```
如上，是负责 Linux 日志处理 rsyslogd 的程序，可见 rsyslogd 的主程序 main 以及它要用到的内核日志模块 imklog 等，同属 1089 进程组。这些进程相互协作，共享 rsyslogd 程序的资源，共同完成 rsyslogd 程序的职责。

对操作系统，这样的进程组更方便管理。Linux 操作系统只需将信号，如 SIGKILL 信号，发给一个进程组，该进程组中的所有进程就都会收到这个信号而终止运行。

那么，现在我们思考一个问题：如果把上面的进程用容器改造跑起来，该如何处理？

或许你会想启动一个 Docker 容器，里面运行两个进程：rsyslogd 执行业务、imklog 处理业务日志。可是这样设计会有一个问题：**容器里面 PID=1 的进程该是谁**？这个问题的核心在于 **Docker 容器的设计本身是一种“单进程”模型**，Docker 只能通过监视 PID 为 1 的进程的运行状态来判断容器的工作状态是否正常。

如果容器想要实现类似操作系统进程组那般互相协作，那么容器下一步的演进就是要找到与“进程组”相对应的概念，这是实现容器从隔离到协作的第一步。

## 超亲密容器组

Kubernetes 中这个设计叫做 Pod，Pod 是一组紧密关联的容器集合，它们共享 IPC 和 Network namespace，是 Kubernetes 调度的基本单位。

容器之间原本是被 Linux Namespace 和 cgroups 隔开的，Pod 第一个要解决的问题是怎么去打破这个隔离，让 Pod  内的容器可以像进程组一样天然的共享资源和数据。

Kubernetes 中使用 Infra Container 解决这个问题。

:::tip 额外知识

Infra Container 启动之后，永远处于 Pause 状态，所以也常被称为“pause 容器”。
默认情况下 infra 镜像的地址为 k8s.grc.io/pause.3.5，很多时候我们部署应用一直处于 Pending状态 ，大部分原因就是这个镜像地址在国内无法访问造成。
:::

Infra Container 是整个 Pod 中第一个启动的容器，只有几百 KB 大小，它负责申请容器组的 UTS、IPC、网络等名称空间，Pod 中的其他容器都会以 Infra Container 作为父容器，共享父容器的命名空间。

<div  align="center">
  <img src="../assets/infra-container.svg" width = "350"  align=center />
  <p>图 Kubernetes 架构</p>
</div>

此刻，同一Pod内的容器共享以下命名空间：

- **UTS 名称空间**：所有容器都有相同的主机名和域名。
- **网络名称空间**：所有容器都共享一样的网卡、网络栈、IP 地址等。同一个 Pod 中不同容器占用的端口不能冲突（这也是 Kubernetes 中 endpoint 的由来）。
- **IPC 名称空间**：所有容器都可以通过信号量或者 POSIX 共享内存等方式通信。
- **时间名称空间**：所有容器都共享相同的系统时间。

此时，Infra Container 中的进程将作为 PID 1 进程，Infra Container 来负责进程管理（譬如清理僵尸进程）、感知状态和传递状态，整个 Pod 的生命周期是等同于 Infra container 的生命周期。Kubernetes 中应用的优雅关闭/平滑升级，终止 Infra pid = 1 进程，内核将调用 SIGKILL 发出终止此 namespace 中的所有进程的信号。

同一个 Pod 的容器，只有 PID 名称空间和文件名称空间默认是隔离的。容器之间也需要相互独立的文件系统以避免冲突。如果容器之间想要想要实现文件共享，使用共享存储卷即可，这也是 Kubernetes Volume 的由来。

如果要共享 PID namespace，需要设置 PodSpec 中的 ShareProcessNamespace 为 true，如下所示。
```
spec:
  shareProcessNamespace: true
```


这个 volume 叫做 shared-data，它是属于 Pod level 的，所以在每一个容器里可以直接声明：要挂载 shared-data 这个 volume，只要你声明了你挂载这个 volume，你在容器里去看这个目录，实际上大家看到的就是同一份。这个就是 Kubernetes 通过 Pod 来给容器共享存储的一个做法。


## Pod 是原子调度单位

Pod 承担的另外一个重要职责是 - 作为调度的原子单位。

协同调度是非常麻烦的事情，不同的系统有不同的解决方案。

比如说在 Mesos 里面，它会做一个事情，叫做资源囤积（resource hoarding）：即当所有设置了 Affinity 约束的任务都达到时，才开始统一调度，这是一个非常典型的成组调度的解法。

在 Mesos 里面，他们不会立刻调度，而是等两个容器都提交完成，才开始统一调度。这样也会带来新的问题，首先调度效率会损失，因为需要等待。由于需要等还会有外一个情况会出现，就是产生死锁，就是互相等待的一个情况。

另一个做法是 Google Omega 系统中的做法，他们在论文《Omega: Flexible, Scalable Schedulers for Large Compute Clusters》[^1] 中介绍了如何使用通过乐观并发（Optimistic Concurrency）、冲突回滚的方式做到高效率，但无疑方案非常复杂。Omega 的失败存在一点点丝丝关系。 

如果将运行资源的需求声明定义在 Pod 上，直接以 Pod 为最小的原子单位来实现调度的话，Pod 与 Pod 之间也不存在什么超亲密关系（想要联系，通过网络就可以了），复杂的协同的调度问题在 Kubernetes 中就直接消失了。

## 容器的设计模式



## Kubernetes 系统架构

Kubernetes 是典型的主从架构。有两部分组成：管理者被称为 Control Plane（控制平面）、被管理者称为 Node（节点）。

<div  align="center">
	<img src="../assets/k8s.png" width = "650"  align=center />
	<p>图 Kubernetes 架构</p>
</div>

### Control Plane

Control Plane 是集群管理者，在逻辑上只有一个。按照习惯称呼，我们也可把该计算机称之为 Master 节点。Control Plane 对节点进行统一管理，调度资源并操作 Pod，它的目标就是使得用户创建的各种 Kubernetes 对象按照其配置所描述的状态运行。它包含如下组件：

- API Server： 操作 Kubernetes 各个资源的应用接口。并提供认证、授权、访问控制、API 注册和发现等机制。
- Scheduler（调度器）：负责调度 Pod 到合适的 Node 上。例如，通过 API Server 创建 Pod 后，Scheduler 将按照调度策略寻找一个合适的 Node。
- Controller Manager（集群控制器）：负责执行对集群的管理操作。例如，按照预期增加或者删除 Pod，按照既定顺序系统一系列 Pod。

### Node

Node 通常也被称为工作节点，可以有多个，用于运行 Pod 并根据 Control Plane 的命令管理各个 Pod，它包含如下组件：

- Kubelet 是 Kubernetes 在 Node 节点上运行的代理，负责所在 Node 上 Pod 创建、销毁等整个生命周期的管理。
- Kube-proxy 在 Kubernetes 中，将一组特定的 Pod 抽象为 Service，Kube-proxy 通过维护节点上的网络规则，为 Service 提供集群内服务发现和负载均衡功能。
- Container runtime (容器运行时)：负责 Pod 和 内部容器的运行。在第七章已经介绍过各类容器运行时，Kubernetes 支持多种容器运行时，如 containerd、Docker 等。

[^1]: 参见 https://static.googleusercontent.com/media/research.google.com/zh-CN//pubs/archive/41684.pdf