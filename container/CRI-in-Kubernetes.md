# 7.4.1 从容器运行时到 CRI

容器的早期阶段，Docker 是容器镜像和容器运行时的行业标准，彼时，Docker 作为容器界的老大也相当“傲慢”，对其他厂商提出的合作邀请充耳不闻，力图独自主导容器生态的发展，加上 Docker 在 Runtime 的向下兼容性的问题，社区口碑较差。

## OCI 

为了容器圈生态的发展，Linux 基金会联合部分科技公司向 Docker 施压，最终 Docker 屈服，并于 2015 年 6 月在 Docker 大会 DockerCon 上推出容器标准，随后和亚马逊、谷歌和 VMware 等公司成立了 OCI（Open Container Initiative，开放容器倡议）组织，该倡议组织的目标是**推动容器运行时和容器镜像格式的开放标准化，创建一套通用的容器标准，以确保不同容器运行时和工具之间的互操作性和可移植性**。 

:::tip Docker 为什么屈服
笔者在本节开篇提及容器技术时，说容器的本质是 namespace、cgroups 技术的组合，而这两项技术并不是 Docker 实现的，它们早 Docker之前就已进入 Linux 内核，换种说法就是 Docker 的容器解决方案离不开 Linux 内核的支持，如果其他行业厂商想自己搞，都可以利用这两项技术自己做一套类似于 Docker 的容器解决方案。

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

早期 Kubernetes 完全依赖且绑定 Docker，并没有过多考虑够日后使用其他容器引擎的可能性。当时 kubernetes 管理容器的方式通过内部的 DockerManager 直接调用 Docker API 来创建和管理容器。

<div  align="center">
	<img src="../assets/k8s-runtime-v1.svg" width = "600"  align=center />
</div>

Docker 盛行之后，CoreOS 推出了 rkt 运行时实现，Kubernetes 又实现了对 rkt 的支持，随着容器技术的蓬勃发展，越来越多运行时实现出现，如果还继续使用与 Docker 类似强绑定的方式，Kubernetes 的工作量将无比庞大。Kubernetes 要重新考虑对所有容器运行时的兼容适配问题了。

Kubernetes 从 1.5 版本开始，在遵循 OCI 基础上，将容器操作抽象为一个接口，该接口作为 Kubelet 与运行时实现对接的桥梁，Kubelet 通过发送接口请求对容器进行启动和管理，各个容器运行时只要实现这个接口就可以接入 Kubernetes，这便是 CRI（Container Runtime Interface，容器运行时接口）。

CRI 实现上是一套通过 Protocol Buffer 定义的 API，如下图：

<div  align="center">
	<img src="../assets/cri-arc.png" width = "450"  align=center />
</div>

从上图可以看出：CRI 主要有 gRPC client、gRPC Server 和具体容器运行时实现三个组件。其中 Kubelet 作为 gRPC Client 调用 CRI 接口，CRI shim 作为 gRPC Server 来响应 CRI 请求，并负责将 CRI 请求内容转换为具体的运行时管理操作。因此，任何容器运行时实现想要接入 Kubernetes，都需要实现一个基于 CRI 接口规范的 CRI shim（gRPC Server）。

2017 年，由 Google、RedHat、Intel、SUSE、IBM 联合发起的 CRI-O（Container Runtime Interface Orchestrator）项目发布了首个正式版本。从名字就可以看出，它非常纯粹, 就是兼容 CRI 和 OCI, 做一个 Kubernetes 专用的轻量运行时。

<div  align="center">
	<img src="../assets/k8s-cri-o.png" width = "440"  align=center />
</div>

虽然 CRI-O 摆出了直接挖掉 Docker 根基手段，但此时 Docker 在容器引擎中的市场份额仍然占有绝对优势，对于普通用户来说，如果没有明确的收益，并没有什么动力要把 Docker 换成别的引擎。不过我们也能够想像此时 Docker 心中肯定充斥了难以言喻的危机感。


不过 Docker 也没有“坐以待毙”，与其将来被人分离或者抛弃不用，不如我主动革新。于是 Docker 采取了“断臂求生”的策略推动自身的重构，把原本单体架构的 Docker Engine 拆分成了多个模块，其中的 Docker daemon 部分就捐献给了 CNCF，形成了 containerd 与 Kubernetes 深度绑定在一起。containerd 作为 CNCF 的托管项目，自然符合 CRI 标准的。但 Docker 出于自己诸多原因的考虑，它只是在 Docker Engine 里调用了 containerd，外部的接口仍然保持不变，也就是说还不与 CRI 兼容。

由于 Docker 的“固执己见”且 Docker 是当时容器技术主流存在，Kuberentes 虽然提出了 CRI 接口规范，仍然需要去适配 CRI 与 Docker 的对接，因此它需要一个中间层（shim，垫片）来对接 Kubelet 和 Docker 运行时实现。此时，Kubernetes 里就出现了两种调用链：第一种是用 CRI 接口调用 dockershim，然后 dockershim 调用 Docker，Docker 再走 containerd 去操作容器。第二种是用 CRI 接口直接调用 containerd 去操作容器。

<div  align="center">
	<img src="../assets/k8s-runtime-v2.png" width = "500"  align=center />
</div>

在这个阶段 **Kubelet 的代码和 dockershim 都是放在一个 Repo**。这也就意味着 dockershim 是由 Kubernetes 进行组织开发和维护！由于 Docker 的版本发布 Kubernetes 无法控制和管理，所以 Docker 每次发布新的 Release，Kubernetes 都要集中精力去快速地更新维护 dockershim。同时 Docker 仅作为容器运行时也过于庞大，Kubernetes 弃用 dockershim 有了足够的理由和动力。

Kubernetes 在 v1.24 版本正式删除和弃用 dockershim，这件事情的本质是废弃了内置的 dockershim 功能转而直接对接 containerd。从上图可以看出在 containerd 1.0 中，对 CRI 的适配是通过一个单独的 CRI-Containerd 进程来完成的，这是因为最开始 containerd 还会去适配其他的系统（比如 swarm），所以没有直接实现 CRI，这个对接工作就交给 CRI-Containerd 这个 shim 了。

2018 年，由 Docker 捐献给 CNCF 的 containerd，在 CNCF 的精心孵化下发布了 1.1 版，1.1 版与 1.0 版的最大区别是此时它已完美地支持了 CRI 标准，这意味着原本用作 CRI 适配器的 cri-containerd 从此不再需要。
<div  align="center">
	<img src="../assets/k8s-runtime-v3.png" width = "500"  align=center />
</div>

Kubernetes 从 1.10 版本宣布开始支持 containerd 1.1，在调用链中已经能够完全抹去 Docker Engine 的存在。此时，再观察 Kubernetes 到容器运行时的调用链，你会发现调用步骤会比通过 DockerShim、Docker Engine 与 containerd 交互的步骤要减少两步，用户只要愿意抛弃掉 Docker 情怀，在容器编排上便可至少省略一次 HTTP 调用，获得性能上的收益。

从 Kubernetes 角度看，选择 containerd 作为运行时的组件，它调用链更短，组件更少，更稳定，占用节点资源更少，根据 Kubernetes 官方给出的测试数据[^1]，containerd1.1 相比当时的 Docker 18.03，Pod 的启动延迟降低了大约 20%，CPU 使用率降低了 68%，内存使用率降低了 12%，这是一个相当大的性能改善，对于云厂商非常有诱惑力。

<div  align="center">
	<img src="../assets/k8s-runtime-v4.svg" width = "650"  align=center />
</div>


今天，符合 CRI 的运行时已达十几种，如下图所示。 要使用哪一种容器运行时取决于你安装 Kubernetes 时宿主机上的容器运行时环境，但对于云计算厂商来说，如果没有特殊的需求（譬如必须隔离内核）采用的容器运行时普遍都已是 containerd，毕竟运行性能对它们来说就是核心生产力和竞争力。

<div  align="center">
	<img src="../assets/runtime.png" width = "550"  align=center />
</div>



[^1]: 参见 https://kubernetes.io/blog/2018/05/24/kubernetes-containerd-integration-goes-ga/


