# 7.4.1 从容器运行时到 CRI

容器的早期阶段，Docker 是容器镜像和容器运行时的行业标准，彼时，Docker 作为容器界的老大也相当“傲慢”，对其他厂商提出的合作邀请充耳不闻，力图独自主导容器生态的发展，加上 Docker 在 Runtime 的向下兼容性的问题，社区口碑较差。

## OCI 

为了容器圈生态的发展，Linux 基金会联合部分科技公司向 Docker 施压，最终 Docker 屈服，并于 2015 年 6 月在 Docker 大会 DockerCon 上推出容器标准，随后和亚马逊、谷歌和 VMware 等公司成立了 OCI（Open Container Initiative，开放容器倡议）组织，该倡议组织的目标是**推动容器运行时和容器镜像格式的开放标准化，创建一套通用的容器标准，以确保不同容器运行时和工具之间的互操作性和可移植性**。 

:::tip Docker 为什么屈服
笔者在本节开篇提及容器技术时，说容器的本质是 namespace、cgroups 技术的组合，而这两项技术并不是 Docker 实现的，它们早 Docker之前就已进入 Linux 内核，换种说法就是 Docker 的容器解决方案离不开 Linux 内核的支持，如果其他行业厂商想自己搞，都可以利用这两项技术自己做一套类似于 Docker 的容器解决方案。

用人家的，吃人家的，当然得听人家的。
:::


OCI 项目启动后不久，Docker 公司便开始自行拆分 docker 并形成一个个新的开源项目。

首先是 Docker 最初使用的容器引擎 libcontainer，这是 Docker 在容器运行时方面的核心组件之一 ，用于实现容器的创建、管理和运行。Docker 将 libcontainer 捐赠给了OCI，成为 OCI Runtime Specification 的基础。在 OCI 的基础上，OCI Runtime Specification 进一步发展演进，并形成了一个名为"runtime-spec" 的项目，后来为了更好地推进容器运行时的标准化和互操作性，OCI runtime-spec 项目与 OCI 的其他相关项目合并，形成了 OCI Runtime Bundle 规范，并将容器运行时的核心组件命名为"runc"。

经过如上的驱动演进之后，OCI 有了三个主要的规范标准：

- **runtime-spec**（容器运行时标准）：定义了容器运行的配置，环境和生命周期。即如何运行一个容器，如何管理容器的状态和生命周期，如何使用操作系统的底层特性（namespace，cgroup，pivot_root 等）。
- **image-spec**（容器镜像标准）：定义了镜像的格式，配置（包括应用程序的参数，环境信息等），依赖的元数据格式等，简单来说就是对镜像的静态描述
- **distribution-spec**（镜像分发标准）：即规定了镜像上传和下载的网络交互过程。

总的来说 OCI 的成立促进了社区的持续创新，同时可以防止行业由于竞争导致的碎片化，容器生态中的各方都能从中获益。

此时的 Docker 想着既然已经开放容器的低层实现 libcontainer，而更高层的容器实现 containerd 与其封闭着给自己，不如一步到位也把它开放出来，让它成为一种标准。随后 Docker 开源 containerd 并将捐赠给了刚成立不久的 CNCF。

## 容器运行时分类

从 docker v1.11 版本开始，docker 就不是简单通过 Docker Daemon 来启动了，而是通过集成 containerd、containerd-shim、runc 等多个组件共同完成。docker 架构流程图已如下所示：

<div  align="center">
	<img src="../assets/docker-arc.png" width = "550"  align=center />
</div>

从 Docker 的拆分来看，容器运行时根据功能的不同分成了两类：只关注如 namespace、cgroups、镜像拆包等基础的容器运行时实现被称为**低层运行时（low-level container runtime）**， 目前应用最广泛的低层运行时是 runc；支持更多高级功能，例如镜像管理、CRI 实现的运行时被称为**高层运行时（high-level container runtime）**，目前应用最广泛高层运行时是 containerd。这两类运行时按照各自的分工，共同协作完成容器整个生命周期的管理工作。

<div  align="center">
	<img src="../assets/container-runtime-relative.png" width = "300"  align=center />
</div>

## CRI

早期 Kubernetes 完全依赖且绑定 Docker，并没有过多考虑够日后使用其他容器引擎的可能性。当时 kubernetes 管理容器的方式通过内部的 DockerManager 直接调用 Docker API 来创建和管理容器。Docker 盛行之后，CoreOS 推出了 rkt 运行时实现，Kubernetes 又实现了对 rkt 的支持，随着容器技术的蓬勃发展，越来越多运行时实现出现，如果还继续使用与 Docker 类似强绑定的方式，Kubernetes 的工作量将无比庞大。Kubernetes 要重新考虑对所有容器运行时的兼容适配问题了。

Kubernetes 从 1.5 版本开始，在遵循 OCI 基础上，将容器操作抽象为一个接口，该接口作为 Kubelet 与运行时实现对接的桥梁，Kubelet 通过发送接口请求对容器进行启动和管理，各个容器运行时只要实现这个接口就可以接入 Kubernetes，这便是 CRI（Container Runtime Interface，容器运行时接口）。

CRI 实现上是一套通过 Protocol Buffer 定义的 API，如下图：

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

2017 年，由 Google、RedHat、Intel、SUSE、IBM 联合发起的 CRI-O（Container Runtime Interface Orchestrator）项目发布了首个正式版本。从名字就可以看出，它非常纯粹, 就是兼容 CRI 和 OCI, 做一个 Kubernetes 专用的轻量运行时。

<div  align="center">
	<img src="../assets/k8s-cri-o.png" width = "480"  align=center />
</div>

虽然 CRI-O 摆出了直接挖掉 Docker 根基手段，但此时 Docker 在容器引擎中的市场份额仍然占有绝对优势，对于普通用户来说，如果没有明确的收益，并没有什么动力要把 Docker 换成别的引擎。不过我们也能够想像此时 Docker 心中肯定充斥了难以言喻的危机感。


