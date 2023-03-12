# Kubernetes 架构

理解 Kubernetes 最好的方式是阅读官方文档，本书绝大部分Kubernetes的内容，也是笔者基于官网文档整理出个人认为重要的部分

那么下面，让我们开始搞清楚 Kubernetes 的架构、组成以及工作方式。

## K8S架构

K8S的架构上有两个大部分：Master Node、Work Node，五个大组件：ApiServer、ControllerManger、Scheduler、Kubelet、KubeProxy。
一开始接触这些概念难免会有些陌生，但本质上这些组件都是K8S的各种能力的抽象和封装。

<div  align="center">
	<img src="/assets/chapter4/kubernetes.png" width = "500"  align=center />
</div>

**Cluster**

Cluster就是集群的意思，即整个k8s管理的所有机器和容器等等的总称。它是计算、存储和网络资源的集合，k8s利用这些资源运行各种基于容器的应用。

**Master**

Master是Cluster中的管理者，即该集群中所有节点的老大或老大们，因为Master可能不止一个，如果是有多个Master节点的集群我们一般称之为高可用集群。它的主要职责是调度，即决定将应用放在哪里运行。


**Node**

Node的职责是运行容器应用。Node由Master管理，Node负责监控并汇报容器的状态，同时根据Master的要求管理容器的生命周期。

**Pod**

Pod是Kubernetes的最小工作单元。每个Pod包含一个或多个容器。Pod中的容器会作为一个整体被Master调度到一个Node上运行。这意味着，即使是只有一个容器，Master也是要把它作为一个Pod调度运行的。

Kubernetes 引入Pod主要基于下面两个目的：

**可管理性**

有些容器天生就是需要紧密联系，一起工作。Pod提供了比容器更高层次的抽象，将它们封装到一个部署单元中。Kubernetes以Pod为最小单位进行调度、扩展、共享资源、管理生命周期。

**通信和资源共享**

Pod 中的所有容器使用同一个网络namespace，即相同的IP地址和Port空间。它们可以直接用localhost通信。同样的，这些容器可以共享存储，当Kubernetes挂载 volume到Pod，本质上是将volume挂载到Pod中的每一个容器。

**namespace**

Kubernetes支持由同一物理集群支持的多个虚拟集群。这些虚拟集群称为namespace。

namespace旨在用于多个用户分布在多个团队或项目中的环境中。对于具有几个到几十个用户的集群，您根本不需要创建或考虑名称空间。当您需要它们提供的功能时，请开始使用命名空间。

- namespace提供名称范围。
- 资源名称在namespace中必须是唯一的，但是在不同的namespace中不必唯一。
- namespace不能彼此嵌套，并且每个Kubernetes资源只能位于一个namespace中。
- namespace是一种在多个用户之间划分群集资源的方法（通过资源配额）。
- 在Kubernetes的未来版本中，默认情况下，同一namespace中的对象将具有相同的访问控制策略。
- 没有必要使用多个namespace来分隔略有不同的资源，例如同一软件的不同版本：可以使用标签来区分同一namespace中的资源。


## Master节点

Master 组件提供的集群控制。Master 组件对集群做出全局性决策(例如：调度)，以及检测和响应集群事件(副本控制器的replicas字段不满足时,启动新的副本)。

Master 组件可以在集群中的任何节点上运行。然而，为了简单起见，设置脚本通常会启动同一个虚拟机上所有 Master 组件，并且不会在此虚拟机上运行用户容器。


### kube-apiserver

kube-apiserver对外暴露了Kubernetes API。它是的 Kubernetes 前端控制层。它被设计为水平扩展，即通过部署更多实例来缩放。

API Server 提供HTTP/HTTPS RESTful API，即Kubernetes API。API Server是Kubernetes Cluster的前端接口，各种客户端工具（CLI或UI）以及Kubernetes其他组件可以通过它管理Cluster的各种资源。

### etcd

etcd用于 Kubernetes 的后端存储。etcd 负责保存Kubernetes Cluster的配置信息和各种资源的状态信息，始终为 Kubernetes 集群的 etcd 数据提供备份计划。当数据发生变化时，etcd 会快速地通知Kubernetes相关组件。

### kube-controller-manager

kube-controller-manager运行控制器，它们是处理集群中常规任务的后台线程。逻辑上，每个控制器是一个单独的进程，但为了降低复杂性，它们都被编译成独立的可执行文件，并在单个进程中运行。

这些控制器包括:

- 节点控制器(Node Controller): 当节点移除时，负责注意和响应。
- 副本控制器(Replication Controller): 负责维护系统中每个副本控制器对象正确数量的 Pod。
- 端点控制器(Endpoints Controller): 填充 端点(Endpoints) 对象(即连接 Services & Pods)。
- 服务帐户和令牌控制器(Service Account & Token Controllers): 为新的namespace创建默认帐户和 API 访问令牌.

### kube-scheduler

kube-scheduler主要的工作就是调度新创建的Pod，当集群中出现了新的Pod还没有确定分配到哪一个Node节点的时候，kube-scheduler会根据各个节点的负载，以及应用对高可用、性能、数据亲和性的需求等各个方面进行分析并将其分配到最合适的节点上。


### Pod 网络

Pod 要能够相互通信，Kubernetes Cluster必须部署Pod网络，Pod网络也能算是属于虚拟化网络/SDN的一种，比较常见的有Calico、Flannel等，也有其他更复杂高级的提供同时多种组合网络如Canal、Knitter、Multus等。


之所以再封装一层是因为 Docker 容器之间的通信受到 Docker 网络机制的限制，我们都知道在 Docker 里一个容器必须经过 link 方式才能访问另一个容器的服务，如果容器少了还好，多了对于 link 来说是个繁重的负担，所以，为了提升效率，Pod 把多个容器都“封装”到一个虚拟的主机里，这样容器之间就可以通过 localhost 进行通信了。

这是一个 Pod 容器：

<div  align="center">
	<img src="/assets/chapter4/k8s-pod.png" width = "400"  align=center />
</div>

一个 Pod 中的应用容器共享同一组资源：PID 命名空间、网络命名空间、IPC 命名空间、UTS 命名空间、Volumes(共享存储)等；


## Node 节点

节点组件在每个节点上运行，维护运行的 Pod 并提供 Kubernetes 运行时环境。

<div  align="center">
	<img src="/assets/chapter4/kubernetes-2.png" width = "400"  align=center />
</div>

### kubelet

kubelet是k8s集群中的每个节点上（包括master节点）都会运行的代理。 它能够保证容器都运行在 Pod 中。kubelet 不会管理不是由 Kubernetes 创建的容器。

kubelet 接收一组通过各类机制提供给它的 PodSpecs，确保这些 PodSpecs 中描述的容器处于运行状态且健康。 当Scheduler确定在某个Node上运行Pod后，会将Pod的具体配置信息（image、volume等）发送给该节点的kubelet，kubelet根据这些信息创建和运行容器，并向Master报告运行状态。

### kube-proxy

kube-proxy 是集群中每个节点上运行的网络代理， kube-proxy通过维护主机上的网络规则并执行连接转发，实现了Kubernetes服务抽象。

service在逻辑上代表了后端的多个Pod，外界通过service访问Pod。service接收到的请求就是通过kube-proxy转发到Pod上的，kube-proxy服务负责将访问service的TCP/UDP数据流转发到后端的容器。如果有多个副本，kube-proxy会实现负载均衡。


