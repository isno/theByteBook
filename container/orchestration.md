# 7.2 以容器构建系统

仍有许多人把容器跟虚拟机相比，把容器当做性能更好的虚拟机，可是无论从实现原理还是使用方法、特性、功能等等，容器都与虚拟机没有任何相似，也不存在一种普遍的方法把虚拟机里面的应用无缝地迁移到容器中。“上云” 最终还是要深入理解容器的本质是什么。

容器的本质是个特殊的进程，就是云时代的操作系统 Kubernetes 中的进程。

在一个真正的 OS 内，进程并非“孤苦伶仃” 独自运行，而是以进程组，有原则的组织在一起。登录到一台 Linux 机器，展示当前系统中正在运行的进程述状结构，执行如下命令：

```
$ pstree -g
[root@VM-12-12-centos ~]# pstree -g
systemd(1)─┬─abrt-dbus(540)─┬─{abrt-dbus}(540)
           │                ├─{abrt-dbus}(540)
           │                └─{abrt-dbus}(540)
           ...
     	   |-rsyslogd(1089)-+-{in:imklog}(1089)
           |  |-{in:imuxsock) S 1(1089)
           | `-{rs:main Q:Reg}(1089)
           ...
```
如上，负责Linux日志处理 rsyslogd 的程序，可见rsyslogd的主程序main，和它要用到的内核日志模块imklog等，同属1089进程组。这些进程相互协作，共同完成rsyslogd程序的职责。

对os，这样的进程组更方便管理。Linux操作系统只需将信号，如SIGKILL信号，发给一个进程组，该进程组中的所有进程就都会收到这个信号而终止运行。而 Kubernetes 所做的，其实就是将“进程组”的概念映射到容器技术，并使其成为云原生操作系统“os”内的“一等公民”。


## 容器设计模式


笔者希望的是能说清楚“Kubernetes为什么这样设计？”，而回答这个问题最好**从它的设计意图出发，从解决问题的角度去理解为什么 Kubernetes 要设计这些资源和控制器**。为此，笔者虚构了一系列从简单到复杂的场景供你代入其中。如此知其所以然，方能真正理解，

:::tip 场景一
假设现在有两个应用，其中一个是 Nginx，另一个是为该 Nginx 收集日志的 Filebeat，你希望将它们封装为容器镜像，以方便日后分发。
:::

最直接的方案就将 Nginx 和 Filebeat 直接编译成同一个容器镜像，这是可以做到的，而且并不复杂，然而这样做会埋下很大隐患：它违背了 Docker 提倡的单个容器封装单进程应用的最佳实践。

:::tip 场景二
假设现在有两个 Docker 镜像，其中一个封装了 HTTP 服务，为便于称呼，我们叫它 Nginx 容器，另一个封装了日志收集服务，我们叫它 Filebeat 容器。现在要求 Filebeat 容器能收集 Nginx 容器产生的日志信息。
:::

场景二依然不难解决，只要在 Nginx 容器和 Filebeat 容器启动时，分别将它们的日志目录和收集目录挂载为宿主机同一个磁盘位置的 Volume 即可，这种操作在 Docker 中是十分常用的容器间信息交换手段。

这种针对具体应用需求来共享名称空间的方案，的确可以工作，却并不够优雅，也谈不上有什么扩展性。容器的本质是对 cgroups 和 namespaces 所提供的隔离能力的一种封装，在 Docker 提倡的单进程封装的理念影响下，容器蕴含的隔离性也多了仅针对于单个进程的额外局限，然而 Linux 的 cgroups 和 namespaces 原本都是针对进程组而不仅仅是单个进程来设计的，同一个进程组中的多个进程天然就可以共享着相同的访问权限与资源配额。

如果现在我们把容器与进程在概念上对应起来，那容器编排的第一个扩展点，就是要找到容器领域中与“进程组”相对应的概念，这是实现容器从隔离到协作的第一步，在 Kubernetes 的设计里，这个对应物叫作 Pod。


<div  align="center">
	<img src="../assets/infra-container.svg" width = "450"  align=center />
	<p>图 Kubernetes 架构</p>
</div>



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