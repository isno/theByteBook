# 7.4.1 从容器运行时到 CRI

docker 属于容器技术早期的发展项目，也是目前最广泛的容器引擎技术。当然，随着容器生态圈的日益繁荣，业界也慢慢出现其他各种运行时工具，例如 Containerd、rkt、CRI-O、Kata Containers 等。

## 容器运行时规范

为了确保不同容器运行时都能够运行任何构建工具生成的镜像，Linux 基金会联合部分科技公司如 CoreOS、Docker Inc、RedHat 和 VMware 等共同成立了开放容器标准 OCI（Open Container Initiative，开放容器标准），OCI 有三个规范。

- runtime-spec：容器运行时标准，定义了容器运行的配置，环境和生命周期。即如何运行一个容器，如何管理容器的状态和生命周期，如何使用操作系统的底层特性（namespace，cgroup，pivot_root 等）。
- image-spec：容器镜像标准，定义了镜像的格式，配置（包括应用程序的参数，环境信息等），依赖的元数据格式等，简单来说就是对镜像的静态描述
- distribution-spec：镜像分发标准，即规定了镜像上传和下载的网络交互过程。

总的来说 OCI 的成立促进了社区的持续创新，同时可以防止行业由于竞争导致的碎片化，容器生态中的各方都能从中获益。

## 容器运行时分类

OCI 项目启动后，docker 便开始自行拆分自己项目并形成一个个新的开源项目，docker 公司将 libcontainer 的实现移动到 runc 并捐赠给了 OCI。随后开源 containerd 并将捐赠给了 CNCF。从 docker 1.11 版本开始，docker 运行就不是简单通过 Docker Daemon 来启动了，现阶段的 Docker 通过集成 containerd、containerd-shim、runc 等多个组件共同完成。docker 架构流程图已如下所示：

<div  align="center">
	<img src="../assets/docker-arc.png" width = "550"  align=center />
</div>

目前较为流行说法根据不同的功能实现将容器运行时分成了低层运行时（low-level container runtime）和高层运行时（high-level container runtime）两类。

通常只关注如 namespace、cgroups、镜像拆包等基础的容器运行时实现被称为**低层运行时**，runc 是目前应用最广泛的低层运行时，由 Docker 中 libcontainer 进化而来。而支持更多高级功能（如镜像管理和 CRI 实现）的运行时通常称为**高层运行时**，最流行的高层运行时莫属 containerd，这是一个从 Docker 项目中分离出来的高层运行时。两类运行时按照各自的分工，共同协作完成容器整个生命周期的管理工作。

<div  align="center">
	<img src="../assets/runtime.png" width = "480"  align=center />
</div>

## 容器运行时接口

早期 Kubernetes 利用 Docker 作为容器运行时实现，直接调用 Docker API 来创建和管理容器。在 Docker 盛行之后，CoreOS 推出了 rkt 运行时实现，Kubernetes 又实现了对 rkt 的支持，随着容器技术的蓬勃发展，越来越多运行时实现出现，Kubernetes 要重新考虑对所有容器运行时的兼容适配问题了。

Kubernetes 从 1.5 版本开始，在遵循 OCI 基础上，将容器操作抽象为一个接口，该接口作为 Kubelet 与运行时实现对接的桥梁，Kubelet 通过发送接口请求对容器进行启动和管理，各个容器运行时只要实现这个接口就可以接入 Kubernetes。

这个接口就是 Kubernetes 容器运行时接口： CRI(Container Runtime Interface)。在 CRI 的定义中，


CRI（Container Runtime Interface，容器运行时接口）是 Kubernetes 定义的一组与容器运行时进行交互的接口，用于将 Kubernetes 平台与特定容器实现解耦，建立业界容器编排对接的标准规范。

CRI 是一套通过 Protocol Buffer 定义的 API，如下图：

<div  align="center">
	<img src="../assets/cri-arc.png" width = "450"  align=center />
</div>

从上图可以看出：CRI 主要有 gRPC client、gRPC Server 和具体容器运行时实现三个组件。其中 Kubelet 作为 gRPC Client 调用 CRI 接口，CRI shim 作为 gRPC Server 来响应 CRI 请求，并负责将 CRI 请求内容转换为具体的运行时管理操作。因此，任何容器运行时实现想要接入 Kubernetes，都需要实现一个基于 CRI 接口规范的 CRI shim（gRPC Server）。

由于容器运行时与镜像的生命周期是彼此隔离的，因此 CRI 主要定义了两类接口：

- RuntimeService 定义跟容器相关的操作，如创建、启动、删除容器等。
- ImageService 定义容器镜像相关的操作，如拉取镜像、删除镜像等。

至此之后，Kubernetes 创建容器流程为： Kubernetes 通过调度制定一个具体的节点运行 Pod，该节点的 Kubelet 在接收到 pod 创建请求后， 调用 GenericRuntime 的通用组件发起创建 Pod 的 CRI 请求给 CRI shim， CRI shim 在收到 CRI 请求后，将其转换为具体的容器运行时指令，并调用相应的容器运行时来创建 Pod，最后将处理结果返回给 Kubelet。

## Docker 与 Kubernetes

Kubernetes 提出 CRI 操作规范时，Docker 刚拆出 containerd，并不支持 CRI 标准。但由于 Docker 是当时容器技术主流存在，Kuberentes 虽然提出了 CRI 接口规范，仍然需要去适配 CRI 与 Docker 的对接，因此它需要一个中间层或 shim（垫片）来对接 Kubelet 和 Docker 运行时实现。

于是 kubelet 中加入了 Dockershim，当 Docker 作为容器运行时，Kubernetes 内启动一个容器流程如下图所示：

<div  align="center">
	<img src="../assets/dockershim.png" width = "600"  align=center />
</div>

在这个阶段 **Kubelet 的代码和 dockershim 都是放在一个 Repo**。这也就意味着 Dockershim 是由 Kubernetes 进行组织开发和维护！由于 Docker 的版本发布 Kubernetes 无法控制和管理，所以每次 Docker 发布新的 Release，Kubernetes 都要集中精力去快速地更新维护 Dockershim。同时如果 Docker 仅作为 runtime 实现也过于庞大，Kubernetes 弃用 Dockershim 有了足够的理由和动力。

Kubernetes 在 v1.24 版本正式删除和弃用 dockershim。这件事情的本质是废弃了内置的 dockershim 功能转而直接对接 containerd。从 containerd 1.0 开始，为了能够减少一层调用的开销，containerd 开发了一个新的 daemon，叫做 CRI-Containerd，直接与 containerd 通信，从而取代了 dockershim。

<div  align="center">
	<img src="../assets/kubelet-cri.png" width = "550"  align=center />
</div>

从 Kubernetes 角度看，选择 containerd 作为运行时的组件，它调用链更短，组件更少，更稳定，占用节点资源更少。
