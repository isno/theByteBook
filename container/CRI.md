# 7.4 容器运行时的演变

Docker 大概也没想到：它诞生十多年后，还能再次成为舆论的焦点。事件的起源是 Kubernetes 宣布开始进入废弃 dockershim 支持的倒计时，最后讹传讹被人误以为 Docker 不能再用了。虽说此次事件有众多标题党的推波助澜，但也从侧面说明了 Kubernetes 与 Docker 的关系十分微妙。

本节，我们根据这两者关系的变化，深入理解 Kubernetes 与各类容器运行时的关系，以及 Kubernetes 容器运行时接口（CRI）的演变。

## 7.4.1 Docker 与 Kubernetes 

早期 Kubernetes 完全依赖且绑定 Docker，由于当时 Docker 太流行了，所以也没有过多考虑够日后使用其他容器引擎的可能性。当时 kubernetes 通过内部的 DockerManager 直接调用 Docker API 来创建和管理容器。

:::center
  ![](../assets/k8s-runtime-v1.svg)<br/>
  图 7-15 Kubernetes 早期调用 Docker 的链路
:::

后来，市场上出现了越来越多的容器容器运行时，比如 CoreOS[^1] 推出的开源容器引擎 Rocket（简称 rkt）。rkt 出现之后，Kubernetes 用类似强绑定 Docker 的方式又实现了对 rkt 容器引擎的支持。

随着容器技术的蓬勃发展，越来越多运行时出现，如果继续使用与 Docker 类似强绑定的方式，Kubernetes 的工作量将无比庞大。Kubernetes 需要重新考虑对所有容器运行时的兼容适配问题了。

## 7.4.2 容器运行时接口 CRI

Kubernetes 从 1.5 版本开始，在遵循 OCI 基础上，将容器操作抽象为一个个接口，这些接口作为 Kubelet（ Kubernetes 中的节点代理）与运行时实现对接的桥梁，Kubelet 通过发送接口请求实现容器进行启动和管理。市场上的各个容器运行时只要实现这些接口就可以接入 Kubernetes，这便是 CRI（Container Runtime Interface，容器运行时接口）。

CRI 实现上是一套通过 Protocol Buffer 定义的 API，从图 7-16 可以看出 CRI 主要有 gRPC Client、gRPC Server 和具体容器运行时实现（container runtime）三个组件。其中：
- Kubelet 作为 gRPC Client 调用 CRI 接口；
- CRI shim 作为 gRPC Server 响应 CRI 请求，并负责将 CRI 请求转换为具体的运行时管理操作。

因此，任何容器运行时想要在 Kubernetes 中运行，只要实现一套 CRI 接口规范的 CRI shim（gRPC Server）即可。

:::center
  ![](../assets//cri-arc.png)<br/>
  图 7-16 CRI 是通过 gRPC 实现的 API
:::

## 7.4.3 Kubernetes 专用容器运行时

2017 年，由 Google、RedHat、Intel、SUSE、IBM 联合发起的 CRI-O（Container Runtime Interface Orchestrator）项目发布了首个正式版本。

从名字就可以看出，它非常纯粹，目标就是兼容 CRI 和 OCI，使得 Kubernetes 不依赖于传统的容器引擎（比如 Docker），也能够实现管理容器各项工作。

:::center
  ![](../assets//k8s-cri-o.png)<br/>
  图 7-17  Kubernetes 专用的轻量运行时 CRI-O
:::

Google 推出 CRI-O 摆出了直接挖掉 Docker 根基的意图，但此时 Docker 在容器生态中的份额仍然占有绝对优势，对于普通用户来说，如果没有明确的收益，并没有什么动力要把 Docker 换成别的容器引擎。不过，我们也能够想像此时 Docker 心中肯定充斥了难以言喻的危机感。

## 7.4.4 Containerd 与 CRI 的关系演进

Docker 并没有“坐以待毙”，开始主动革新。回顾本书第一章 1.5.1 节关于 Docker 演进的介绍，Docker 从 1.1 版本起推动自身的重构，并拆分出 Containerd。

早期 Containerd 单独开源，并没有捐献给 CNCF，Docker 也出于诸多原因的考虑，对外部开放的接口仍然保持不变。这个背景下，Kubernetes 里出现下面两种调用链：
- CRI 接口调用适配器 dockershim，然后 dockershim 调用 Docker，Docker 再调用 Containerd 操作容器。
- CRI 接口调用适配器 cri-containerd，cri-containerd 再去调用 Containerd 操作容器（最开始 Containerd 还会适配其他的容器编排系统，如 Swarm，所以也并没有直接实现 CRI 接口）。

:::center
  ![](../assets//k8s-runtime-v2.png)<br/>
  图 7-18  Containerd 与 Docker 都不支持直接与 CRI 交互
:::

这个阶段 **Kubelet 的代码和 dockershim 的代码都是放在一个仓库内的**，这意味着 dockershim 得由 Kubernetes 进行组织开发和维护，但 Docker 版本的更新 Kubernetes 无法控制和管理，所以 Docker 每次发布新的版本，Kubernetes 都要集中精力去快速地更新维护 dockershim。

同时 Docker 仅作为容器运行时也过于庞大，Kubernetes 弃用 dockershim 有了足够的理由和动力。2018 年，Docker 将 Containerd 捐献给 CNCF，并在 CNCF 的精心孵化下发布了 1.1 版，1.1 版与 1.0 版的最大区别是此时它已完美地支持了 CRI 标准，这意味着原本用作 CRI 适配器的 CRI-Containerd 从此不再需要。

**Kubernetes v1.24 版本正式删除 dockershim，本质是废弃了内置的 dockershim 功能转而直接对接 Containerd**。

:::center
  ![](../assets//k8s-runtime-v3.png)<br/>
  图 7-19  Containerd 1.1 起，开始完美支持 CRI 
:::

再观察 Kubernetes 到容器运行时的调用链，你会发现调用步骤会比通过 DockerShim、Docker Engine 与 Containerd 交互的步骤要减少两步，此时：
- 用户只要愿意抛弃掉 Docker 情怀，容器编排上可至少省略一次调用，获得性能上的收益；
- 从 Kubernetes 角度看，选择 Containerd 作为运行时的组件，调用链更短、更稳定、占用节点资源也更少。

根据 Kubernetes 官方给出的 Containerd 1.1 对比 Docker 18.03 性能测试数据，Pod 的启动延迟降低了大约 20%；CPU 使用率降低了 68%；内存使用率降低了 12%，这是一个相当大的性能改善。

:::center
  ![](../assets/k8s-runtime-v4.svg)<br/>
  图 7-20 Containerd 与 Docker 的性能对比
:::

## 7.4.5 安全容器运行时

尽管容器有许多技术优势，然而以 runc 为代表基于共享内核技术进行的“软隔离”，还是存在一定的风险性。如果某个恶意程序利用系统缺陷从容器中逃逸，就会对主机造成严重威胁，尤其是公有云环境，安全威胁很可能会波及到其他用户的数据和业务。

出于对传统容器安全性的担忧，Intel 在 2015 年启动了它们以虚拟机为基础的容器技术：Clear　Container。Clear Container 依赖 Intel VT 的硬件虚拟化技术以及高度定制的 QEMU-KVM（qemu-lite）来提供高性能的基于虚拟机的容器。在 2017 年，Clear container 项目加入了 Hyper RunV，这是一个基于 hypervisor 的 OCI 运行时。最终，以上项目合并，成了现在耳熟能详的 Kata Containers 项目。

Kata Containers 本质是通过虚拟化的硬件模拟出一台“微型虚拟机”，然后在这台虚拟机中安装了一个精简的 Linux 内核来实现强隔离。Kata Containers 的虚拟机中有一个特殊的 init 进程负责虚拟机内的进程，虚拟机内的进程天然就共享各个命名空间，也就是说 Kata Containers 天生就带有 Pod 的概念。 

:::center
  ![](../assets/kata-container.jpeg)<br/>
  图 7-21 Kata Containers 与传统容器技术的对比 [图片来源](https://katacontainers.io/learn/)
:::

此外，为了跟上层编排框架对接，融入容器生态，Kata-Containers 运行符合 OCI 规范，同时兼容 Kubernetes CRI，它们的集成关系如图 7-22 所示。

:::center
  ![](../assets/kata-container.jpg)<br/>
  图 7-22 CRI 和 Kata Containers 的集成 [图片来源](https://github.com/kata-containers/documentation/blob/master/design/architecture.md)
:::

AWS 在 2018 年末发布了安全容器项目 Firecracker，该项目的核心其实是一个用 Rust 语言编写的，配合 KVM 使用的 VMM（Virtual Machine Manager，虚拟机管理程序），因此 Firecracker 还必须配合上 containerd 才能支持容器生态。所以 AWS 又开源了 firecracker-containerd 项目，用于对接 Kubernetes 生态。

本质上 Firecracker-containerd 是另外一个私有化、定制化的 Kata containers，整体架构和 Kata containers 类似，只是放弃了一些兼容性换取更简化的实现。

## 7.4.6 容器运行时生态

今天，如图 7-23 所示，符合 CRI 规范的容器运行时已达十几种，要使用哪一种容器运行时取决于你安装 Kubernetes 时宿主机上的容器运行时环境。

但对于云计算厂商来说，如果没有特殊的需求（例如因为安全性要求必须隔离内核）采用的容器运行时普遍都已是 Containerd，毕竟运行性能以及稳定对它们来说就是核心生产力和竞争力。

:::center
  ![](../assets/runtime.png)<br/>
  图 7-23 容器运行时生态 [图片来源](https://landscape.cncf.io/guide#runtime--container-runtime)
:::

[^1]: CoreOS 是一款产品也是一个公司的名称，后来产品改名 Container Linux。除了 Container Linux，CoreOS 还开发了 Etcd、Flannel、CNI 这些影响深远的项目。2018 年 1 月 30 号，CoreOS 被 RedHat 以 2.5 亿美的价格收购（当时 CoreOS 的员工才 130 人）。
[^1]: 参见 https://kubernetes.io/blog/2018/05/24/kubernetes-containerd-integration-goes-ga/
