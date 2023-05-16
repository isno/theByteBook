# CRI in Kubernetes

Kubernetes 是当今主流的容器编排平台，为了适应不同场景的需求，Kubernetes需要有使用不同容器运行时的能力。

为此，Kubernetes从1.5版本开始，在kubelet中增加了一个容器运行时接口CRI(Container Runtime Interface)，需要接入Kubernetes的容器运行时必须实现CRI接口。由于kubelet的任务是管理本节点的工作负载，需要有镜像管理和运行容器的能力，因此只有高层容器运行时才适合接入CRI。

## CRI

CRI（Container Runtime Interface，容器运行时接口）是 Kubernetes 定义的一组与容器运行时进行交互的接口，用于将 Kubernetes 平台与特定的容器实现解耦。在 Kubernetes 早期的版本中，对于容器环境的支持是通过 Dockershim(hard code) 方式直接调用 Docker API 的，后来为了支持更多的容器运行时和更精简的容器运行时，Kubernetes 在遵循 OCI 基础上提出了CRI。

CRI 是一套通过 protocol buffers 定义的 API，如下图：

<div  align="center">
	<img src="../assets/cri-arc.png" width = "450"  align=center />
</div>

kubelet 实现了 client 端，CRI shim 实现 server 端。只要实现了对应的接口，就能接入 k8s 作为 Container Runtime。


## Dockershim

而在 Kubernetes 提出 CRI 操作规范时，Docker刚拆出 containerd，并不支持 CRI 标准。由于当时Docker是容器技术最主流也是最权威的存在，Kuberentes虽然提出了CRI接口规范，但仍然需要去适配CRI与Docker的对接，因此它需要一个中间层或 shim 来对接 Kubelet 和 Docker 的 contianer runtime。

于是 kubelet 中加入了 Dockershim。使用 docker 作为 runtime 的时，实际启动一个容器的过程是：

<div  align="center">
	<img src="../assets/dockershim.png" width = "600"  align=center />
</div>


在这个阶段 **Kubelet 的代码和 dockershim 都是放在一个Repo**。

这也就意味着Dockershim是由K8S组织进行开发和维护！由于Docker公司的版本发布K8S组织是无法控制和管理，所以每次Docker发布新的Release，K8S组织都要集中精力去快速地更新维护Dockershim。

同时 Docker Engine 也过于庞大。

### Kubernetes 弃用 Dockershim

Kubernetes1.24版本正式删除和弃用dockershim。这件事情的本质是废弃了内置的 dockershim 功能，直接对接Containerd（后续已经支持 CRI）。从 containerd 1.0 开始，为了能够减少一层调用的开销，containerd 开发了一个新的 daemon，叫做 CRI-Containerd，直接与 containerd 通信，从而取代了 dockershim。

<div  align="center">
	<img src="../assets/kubelet-cri.png" width = "550"  align=center />
</div>

从 Kubernetes 的角度看，选择 containerd作为运行时的组件，它调用链更短，组件更少，更稳定，占用节点资源更少。

### containerd-shim

shim 是垫片的意思，实现了 CRI 接口的容器运行时通常称为 CRI shim，这是一个 gRPC Server，监听在本地的 unix socket 上；而 kubelet 作为 gRPC 的客户端来调用 CRI 接口，来进行 Pod 和容器、镜像的生命周期管理。

使用shim的主要作用剥离 containerd 守护进程与容器进程，将 containerd 和真实的容器解耦。主要的作用如下：

- 允许runc在创建&运行容器之后退出
- 用shim作为容器的父进程，而不是直接用containerd作为容器的父进程，是为了防止这种情况：当containerd挂掉的时候，shim还在，因此可以保证容器打开的文件描述符不会被关掉
- 依靠shim来收集&报告容器的退出状态，这样就不需要containerd来wait子进程

Go编译出来的二进制文件，默认是静态链接，因此，如果一个机器上起 N 个容器，那么就会占用`M*N` 的内存，其中 M 是一个 runc 所消耗的内存, 但是出于解耦等原因不想直接让containerd来做容器的父进程，因此，就需要一个比runc占内存更小的东西来作父进程，也就是 shim。但实际上，shim 仍然比较占内存。


## CRI plugin

虽然取消了 dockershim， 但是这仍然多了一个独立的 daemon，从 containerd 1.1 开始，社区选择在 containerd 中直接内建 CRI plugin，通过方法调用来进行交互，从而减少一层 gRPC 的开销，最终的容器启动流程如下：

<div  align="center">
	<img src="../assets/containerd-built-in-plugin.png" width = "600"  align=center />
</div>

最终的结果是 Kubernetes 的 Pod 启动延迟得到了降低，CPU 和内存占用率都有不同程度的降低。

但是这还不是终点，为了能够直接对接 OCI 的 runtime 而不是 containerd，社区孵化了 CRI-O 并加入了 CNCF。CRI-O 的目标是让 kubelet 与运行时直接对接，减少任何不必要的中间层开销。CRI-O 运行时可以替换为任意 OCI 兼容的 Runtime，镜像管理，存储管理和网络均使用标准化的实现

<div  align="center">
	<img src="../assets/k8s-cri-o.png" width = "500"  align=center />
</div>


## 小结

梳理完 CRI 的发展关系后，总结 kubelet 调用 各容器运行时 关系如下图所示：

<div  align="center">
	<img src="../assets/kubelet.png" width = "600"  align=center />
</div>
