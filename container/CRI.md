# 7.4.2 CRI 运行时规范

:::tip <a/> 
本节 Kubernetes 容器运行时调用链配图以及性能测试数据来源于文章《Kubernetes Containerd Integration Goes GA》[^1]，在此统一注明，后面不再单独列出。
:::

早期 Kubernetes 完全依赖且绑定 Docker，并没有过多考虑够日后使用其他容器引擎的可能性。当时 kubernetes 管理容器的方式通过内部的 DockerManager 直接调用 Docker API 来创建和管理容器。

:::center
  ![](../assets/k8s-runtime-v1.svg)<br/>
  图 7-15 Kubernetes 早期调用 Docker 的链路
:::

Docker 和 CoreOS 分裂之后，被 Google 投资的 CoreOS 推出了 rkt 运行时实现，Kubernetes 又实现了对 rkt 的支持。随着容器技术的蓬勃发展，越来越多运行时出现，如果继续使用与 Docker 类似强绑定的方式，Kubernetes 的工作量将无比庞大。

Kubernetes 要重新考虑对所有容器运行时的兼容适配问题了。

## 1. 容器运行时接口 CRI

Kubernetes 从 1.5 版本开始，在遵循 OCI 基础上，将容器操作抽象为一个接口，该接口作为 Kubelet 与运行时实现对接的桥梁，Kubelet 通过发送接口请求对容器进行启动和管理，各个容器运行时只要实现这个接口就可以接入 Kubernetes，这便是 CRI（Container Runtime Interface，容器运行时接口）。

CRI 实现上是一套通过 Protocol Buffer 定义的 API，从配图 7-16 可以看出 CRI 组成主要有 gRPC Client、gRPC Server 和具体容器运行时实现三个组件。其中：
- Kubelet 作为 gRPC Client 调用 CRI 接口；
- CRI shim 作为 gRPC Server 来响应 CRI 请求，并负责将 CRI 请求内容转换为具体的运行时管理操作。

因此，任何容器运行时想要在 Kubernetes 中运行，都需要实现一套基于 CRI 接口规范的 CRI shim（gRPC Server）。

:::center
  ![](../assets//cri-arc.png)<br/>
  图 7-16 CRI 是通过 gRPC 实现的 API
:::

## 2. Kubernetes 专用容器运行时 CRI-O

2017 年，由 Google、RedHat、Intel、SUSE、IBM 联合发起的 CRI-O（Container Runtime Interface Orchestrator）项目发布了首个正式版本。

从名字就可以看出，它非常纯粹，目标就是兼容 CRI 和 OCI, 做一个 Kubernetes 专用的轻量运行时。

:::center
  ![](../assets//k8s-cri-o.png)<br/>
  图 7-17  Kubernetes 专用的轻量运行时 CRI-O
:::

Google 推出 CRI-O 摆出了直接挖掉 Docker 根基的意图，但此时 Docker 在容器生态中的份额仍然占有绝对优势，对于普通用户来说，如果没有明确的收益，并没有什么动力要把 Docker 换成别的引擎。

不过也能够想像此时 Docker 心中肯定充斥了难以言喻的危机感。

## 3. Containerd 与 CRI 的关系演进

Docker 并没有“坐以待毙”，开始主动革新。

回顾上文关于 Docker 演进的介绍，Docker 从 1.1 版本起推动自身的重构，并拆分出 Containerd。

早期 Containerd 单独开源，并没有捐献给 CNCF，Docker 也出于诸多原因的考虑，对外部开放的接口仍然保持不变。这个背景下，Kubernetes 里出现下面两种调用链：
1. CRI 接口调用适配器 dockershim，然后 dockershim 调用 Docker，Docker 再调用 Containerd 操作容器。
2. CRI 接口调用适配器 cri-containerd，cri-containerd 再去调用 Containerd 操作容器（最开始 Containerd 还会去适配其他的容器编排系统，如 Swarm，所以并没有直接实现 CRI）。

:::center
  ![](../assets//k8s-runtime-v2.png)<br/>
  图 7-18  Containerd 与 Docker 都不支持直接与 CRI 交互
:::

这个阶段 **Kubelet 的代码和 dockershim 都是放在一个 Repo**。这意味着 dockershim 是由 Kubernetes 进行组织开发和维护！由于 Docker 的版本发布 Kubernetes 无法控制和管理，所以 Docker 每次发布新的 Release，Kubernetes 都要集中精力去快速地更新维护 dockershim。

同时 Docker 仅作为容器运行时也过于庞大，Kubernetes 弃用 dockershim 有了足够的理由和动力。**Kubernetes v1.24 版本正式删除 dockershim，本质是废弃了内置的 dockershim 功能转而直接对接 Containerd**。

2018 年，Docker 将 Containerd 捐献给 CNCF，并在 CNCF 的精心孵化下发布了 1.1 版，1.1 版与 1.0 版的最大区别是此时它已完美地支持了 CRI 标准，这意味着原本用作 CRI 适配器的 CRI-Containerd 从此不再需要。

:::center
  ![](../assets//k8s-runtime-v3.png)<br/>
  图 7-19  Containerd 1.1 起，开始完美支持 CRI 
:::

再观察 Kubernetes 到容器运行时的调用链，你会发现调用步骤会比通过 DockerShim、Docker Engine 与 Containerd 交互的步骤要减少两步，此时：
- 用户只要愿意抛弃掉 Docker 情怀，容器编排上可至少省略一次调用，获得性能上的收益；
- 从 Kubernetes 角度看，选择 Containerd 作为运行时的组件，调用链更短、更稳定、占用节点资源也更少。

根据 Kubernetes 官方给出的 Containerd1.1 对比 Docker 18.03 测试数据，Pod 的启动延迟降低了大约 20%；CPU 使用率降低了 68%；内存使用率降低了 12%，这是一个相当大的性能改善。

:::center
  ![](../assets/k8s-runtime-v4.svg)<br/>
  图 7-20 Containerd vs Docker 的性能测试
:::

## 4. 安全容器运行时 Kata Containers

尽管容器有许多技术优势，然而传统以 runc 为代表基于共享内核技术进行的软隔离还是存在一定的风险性。如果某个恶意程序利用系统缺陷从容器中逃逸，就会对宿主机造成严重威胁，尤其是公有云环境，安全威胁很可能会波及到其他用户的数据和业务。

将虚拟机的安全优势与容器的高速及可管理性相结合，为用户提供标准化、安全、高性能的容器解决方案，于是就有了 Kata Containers。

:::center
  ![](../assets/kata-container.jpeg)<br/>
  图 7-21 Kata Containers 与传统容器技术的对比 [图片来源](https://katacontainers.io/learn/)
:::

Kata Containers 安全容器的诞生解决了许多普通容器场景无法解决的问题，譬如多租户安全保障、差异化 SLO 混合部署、可信/不可信容器混合部署等等。这些优势的基础上，Kata Containers 也在虚拟化上也追求极致的轻薄，从而让整体资源消耗和弹性能力接近 runc 容器方案，以此达到 Secure as VM、Fast as Container 的技术目标。

为了缩短容器的调用链，高效和 Kubernetes CRI 集成，Kata-Container 直接将 containerd-shim 和 kata-shim 以及 kata-proxy 融合到一起，运行符合 OCI 规范，同时兼容 Kubernetes CRI（虚拟机级别的 Pod 实现），它们的集成关系如图 7-22 所示。

:::center
  ![](../assets/kata-container.png)<br/>
  图 7-22 CRI 和 Kata Containers 的集成 [图片来源](https://github.com/kata-containers/documentation/blob/master/design/architecture.md)
:::

## 5. 容器运行时生态

今天，如图 7-23 所示，符合 CRI 规范的容器运行时已达十几种，要使用哪一种容器运行时取决于你安装 Kubernetes 时宿主机上的容器运行时环境。对于云计算厂商来说，如果没有特殊的需求（譬如因为安全性要求必须隔离内核）采用的容器运行时普遍都已是 Containerd，毕竟运行性能以及稳定对它们来说就是核心生产力和竞争力。

:::center
  ![](../assets/runtime.png)<br/>
  图 7-23 容器运行时生态 [图片来源](https://landscape.cncf.io/guide#runtime--container-runtime)
:::

[^1]: 参见 https://kubernetes.io/blog/2018/05/24/kubernetes-containerd-integration-goes-ga/
