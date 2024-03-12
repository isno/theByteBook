# 7.2 以容器构建系统

仍有许多人把容器跟虚拟机相比，把容器当做性能更好的虚拟机，可是无论从实现原理还是使用方法、特性、功能等比较，容器都与虚拟机没有任何相似，也不存在一种普适的方法把虚拟机里面的应用无缝地迁移到容器中。

“上云” 最终还是要深入理解容器的本质是什么。

## 容器的本质是隔离的进程

那么，容器是本质什么呢？如果把 Kubernetes 比作云原生时代的操作系统，那么容器就是这个操作系统之内的特殊进程。

特殊之处在于容器利用一些内核技术对进程的视图进行隔离，使用的资源进行限制。给进程创造出一个运行沙盒，给以占有所有的资源、独立拥有整个操作系统的假象。

:::tip namespace

namespace 的早期提出以及使用要追溯到贝尔实验室开发的一个名叫 Plan 9 的分布式操作系统。最初的目的是为了实现文件的隔离，并非为了容器而设计。

后来系统隔离的呼声愈发强烈，Linux 内核从 2.4.19 起，陆续添加了 Mount、UTS、IPC、PID、Network 等 namespace 隔离功能。到 Linux 3.8，又增加了 User namespace。至此，Docker 以及其他容器技术所用到的 namespace 已全部就绪。

:::

使用 Namespace 其实也非常简单，它其实只是 Linux 创建新进程的一个可选参数。比如，在 Linux 系统中创建线程的系统调用是 clone。
```
int clone(int (*fn)(void *), void *child_stack,
         int flags, void *arg, ...
         /* pid_t *ptid, struct user_desc *tls, pid_t *ctid */ );
```

当我们创建一个新的进程时，

```
int pid = clone(main_function, stack_size, CLONE_NEWPID | SIGCHLD, NULL); 
```

这时，新创建的这个进程将会“看到”一个全新的进程空间，在这个进程空间里，它的 PID 是 1。这些进程就会觉得自己是各自 PID Namespace 里的第 1 号进程，只能看到各自 Mount Namespace 里挂载的目录和文件，只能访问到各自 Network Namespace 里的网络设备，就仿佛运行在一个个“容器”里面，与世隔绝。

进程的视图隔离已经完成，如果再对使用资源进行限制，那么就能对进程的运行环境实现一个进乎完美的隔离。这就要用到上面提到的第二项技术： Linux Control Cgroup，即 cgroups。

cgroups 是一种内核级别的资源管理机制，最早由 Google 工程师在 2007年提出，它主要的作用就是限制一个进程组所使用的资源上限。使用 cgroups 也很方便，通过 /sys/fs/cgroup 查看系统支持的被限制的资源种类。然后再想限制的资源下新建一个目录，配置资源的限制，绑定指定的进程即可。

由此可见，容器不是轻量化的虚拟机，也没有创造出真正的沙盒（共享了操作系统内核，这也是为什么又出现了 kata、gVisor 等沙盒容器），只是使用了 namespace 技术进行隔离、cgroups 技术进行资源限制的进程。。

## 容器编排的第一个扩展是进程组

在一个真正的 OS 内，进程并非“孤苦伶仃”独自运行，而是以进程组，有原则的组织在一起。

登录到一台 Linux 机器，展示当前系统中正在运行的进程述状结构，执行如下命令：

```
$ pstree -g
    |-rsyslogd(1089)-+-{in:imklog}(1089)
    |  |-{in:imuxsock) S 1(1089)
    | `-{rs:main Q:Reg}(1089)
```
如上，负责Linux日志处理 rsyslogd 的程序，可见rsyslogd的主程序main，和它要用到的内核日志模块imklog等，同属1089进程组。这些进程相互协作，共享 rsyslogd 程序的资源，共同完成 rsyslogd 程序的职责。

对os，这样的进程组更方便管理。Linux操作系统只需将信号，如 SIGKILL 信号，发给一个进程组，该进程组中的所有进程就都会收到这个信号而终止运行。

那么现在的问题是如果把上面的进程用容器跑起来，你该怎么做？自然的解法启动一个 Docker 容器，里面运行四个进程，可是这样会有一个问题：容器里面 PID=1 的进程该是谁？这个核心问题在于容器的设计本身是一种“单进程”模型，容器的应用等于进程，Docker 也只能通过监视 PID 为 1 的进程的运行状态来判断容器的工作状态是否正常。

既然我们把容器与进程在概念上对应起来，那容器编排的第一个扩展点，就是要找到容器领域中与“进程组”相对应的概念，这是实现容器从隔离到协作的第一步。

## 超亲密容器组

进程组的实现在 Kubernetes 中叫做 Pod，Pod 是 Kubernetes 中最基本、最重要的概念。


容器之间原本是被 Linux Namespace 和 cgroups 隔开的，Pod 第一个要解决的问题是怎么去打破这个隔离，让 Pod  内的容器可以像进程组一样天然的共享资源和数据（例如网络和存储）。

Kubernetes 中使用 Infra Container 解决这个问题。Infra Container 是整个 Pod 中第一个启动的容器，只有几百 KB 大小，Pod 中的其他容器都会以 Infra Container 作为父容器，UTS、IPC、网络等名称空间实质上都是来自 Infra Container 容器。

:::tip 额外知识

Infra Container 启动之后，永远处于 Pause 状态，所以也常被称为“pause 容器”。

默认情况下 infra 镜像的地址为 k8s.grc.io/pause.3.5，很多时候我们部署应用一直处于 Pending状态 ，大部分原因就是这个镜像地址在国内无法访问造成。
:::


<div  align="center">
  <img src="../assets/infra-container.svg" width = "350"  align=center />
  <p>图 Kubernetes 架构</p>
</div>

此时，Infra Container 中的进程将作为 PID 1 进程，Infra Container 来负责进程管理（譬如清理僵尸进程）、感知状态和传递状态，整个 Pod 的生命周期是等同于 Infra container 的生命周期。


这个 volume 叫做 shared-data，它是属于 Pod level 的，所以在每一个容器里可以直接声明：要挂载 shared-data 这个 volume，只要你声明了你挂载这个 volume，你在容器里去看这个目录，实际上大家看到的就是同一份。这个就是 Kubernetes 通过 Pod 来给容器共享存储的一个做法。


## Pod 是原子调度单位

比如说在 Mesos 里面，它会做一个事情，叫做资源囤积（resource hoarding）：即当所有设置了 Affinity 约束的任务都达到时，才开始统一调度，这是一个非常典型的成组调度的解法。

在 Mesos 里面，他们不会立刻调度，而是等两个容器都提交完成，才开始统一调度。这样也会带来新的问题，首先调度效率会损失，因为需要等待。由于需要等还会有外一个情况会出现，就是产生死锁，就是互相等待的一个情况。

另一个做法是Google Omega 系统中的做法， https://static.googleusercontent.com/media/research.google.com/zh-CN//pubs/archive/41684.pdf

如果将运行资源的需求声明定义在 Pod 上，直接以 Pod 为最小的原子单位来实现调度的话，Pod与Pod之间也不存在什么超亲密关系，复杂的协同的调度问题在 Kubernetes 中就直接消失了。

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