# 7.3.1 Docker 的演变

笔者曾提及云原生早期阶段，将 Docker 作为容器技术代表实至名归。这句话还有一层背后的含义：

:::tip <a/>

容器技术被传颂并深入人心，是因为 Docker；但是，其实技术积累由来已久，早期的容器技术是 Google、IBM 等公司贡献出来的，Pivotal 也发展了 Warden 容器技术，这些公司都专注于在各自的常规业务中，并没有重点投入容器技术；而 Docker 很好地将容器技术单独形成项目产品推向社区。

:::

早期的容器生态圈内，还有一个不能忽视的角色 CoreOS，它定位于容器设计的操作系统。作为 Docker 的互补，CoreOS+Docker 曾经也是容器部署的明星套餐。然而好景不长，与之前对 Docker 的期望是“一个简单的基础单元”不同，收购一些公司大张旗鼓地发展 Swarm，集中发力集群编排管理，而这与 CoreOS 的布局有直接竞争关系。

于是，2014 年底就有了 CoreOS 与 Docker 的分手事件，其导火索是 CoreOS 撇开 Docker，推出了与 Docker 对抗的开源容器引擎 Rocket（简称rkt），并联合一些知名的 IT 公司成立委员会试图主导容器技术的标准化。最终 CoreOS 在 2015 榜上 Google 公司，并联合推出基于 CoreOS + Rocket + Kubernetes 的商用容器平台 Tectonic。从此，容器江湖分为两大阵营，Google 派系和 Docker 派系。

## OCI 

这也让当时 Docker 阵营和粉丝们无比担心 Docker 的命运，不管最终鹿死谁手，容器技术的分裂对所有牵涉其中的人没有任何好处，于是 Linux 基金会出面调和，双方各退一步，最终结果是 Linux 基金会于 2015 年 6 月在  DockerCon 大会上宣布成立 OCI（Open Container Initiative，开放容器倡议）项目[^1]。

OCI 的成立最终结束了容器技术标准之争，Docker 公司也被迫放弃自己的独家控制权。作为回报，Docker 的容器格式被 OCI 采纳为新标准的基础，并且由 Docker 起草 OCI 草案规范的初稿。

当然这个“标准起草者” 也不是那么好当的，Docker 需要提交自己的容器引擎源码作为启动资源。首先是 Docker 最初使用的容器引擎 libcontainer，这是 Docker 在容器运行时方面的核心组件之一 ，用于实现容器的创建、管理和运行。Docker 将 libcontainer 捐赠给了OCI，成为 runtime-spec 的基础。在 OCI 的基础上，后来为了更好地推进容器运行时的标准化和互操作性，OCI runtime-spec 项目与 OCI 的其他相关项目合并，形成了 OCI Runtime Bundle 规范，并将容器运行时的核心组件命名为"runc"。

:::tip runc

RunC 是非常小的运行核，其目的在于提供一个干净简单的运行环境，他就是负责隔离 CPU、内存、网络等形成一个运行环境，可以看作一个小的操作系统。RunC 的使用者都是一些 CaaS 服务商，个人开发者知晓的并不是太多。

Docker 是从 1.11 支持 RunC 的，想必 Docker 当时的心态也很复杂：一方面作为 OCI 成员必须支持 RunC，但是另一方面他会担心 RunC 对 Docker 的替代的威胁。
:::



经过如上的驱动演进之后，OCI 有了三个主要的规范标准：

- **runtime-spec**（容器运行时标准）：定义了容器运行的配置，环境和生命周期。即如何运行一个容器，如何管理容器的状态和生命周期，如何使用操作系统的底层特性（namespace，cgroup，pivot_root 等）。
- **image-spec**（容器镜像标准）：定义了镜像的格式，配置（包括应用程序的参数，环境信息等），依赖的元数据格式等，简单来说就是对镜像的静态描述
- **distribution-spec**（镜像分发标准）：即规定了镜像上传和下载的网络交互过程。



总的来说 OCI 的成立促进了社区的持续创新，同时可以防止行业由于竞争导致的碎片化，容器生态中的各方都能从中获益。

## Containerd

Docker 投入巨大的精力进入容器编排领，发展也并不顺利，一系列举动被视为捆绑竞争，非但没有让人对其技术刮目相看，反而损坏他与生态圈内其他厂商的关系。经过在容器编排领域激烈的碰撞之后，Docker 又回归到自己擅长的老本行中，将视线从编排界收回到容器技术。

在 2017 年 12 月，Docker 开源了 Containerd，它是为 RunC 提供接口并进行镜像的管理。非常有意思的是 Docker 没有把 Containerd 贡献给 Apache/Linux 之类的基金会，或是直接贡献给 RunC，而是单独开源，这其实也不失为一种对 RunC 的堤防措施，让大家在使用 RunC 同时也不忘记 Docker，开源的举措也可以一定程度缓和关系。

:::center
  ![](../assets/containerd-arch.png)<br/>

  containerd 架构
:::

Docker 开源 Containerd 的举措可以解读为 Docker 对容器技术的回归，希望 Docker 的生态更加开放，更良性的发展，降低业界对 Docker 封闭的担心，同时也是通过 Containerd 作为桥梁，让大家更多地关注回 Docker，抵消因为生态分裂对 Docker 带来的不利影响。

## Docker 现在的架构

最终，经过一系列的改造、拆分之后，从 docker v1.11 版本开始，docker 就不是简单通过 Docker Daemon 来启动了，而是通过集成 containerd、containerd-shim、runc 等多个组件共同完成。docker 架构流程图已如下所示：

<div  align="center">
	<img src="../assets/docker-arc.png" width = "550"  align=center />
</div>

从 Docker 的拆分来看，容器运行时根据功能的不同分成了两类：
- 只关注如 namespace、cgroups、镜像拆包等基础的容器运行时实现被称为**低层运行时（low-level container runtime）**， 目前应用最广泛的低层运行时是 runc；
- 支持更多高级功能，例如镜像管理、CRI 实现的运行时被称为**高层运行时（high-level container runtime）**，目前应用最广泛高层运行时是 containerd。

这两类运行时按照各自的分工，共同协作完成容器整个生命周期的管理工作。

[^1]: 该项目最初的名字叫 OCP（Open Container Project），不过因为 OCP 容易和 Open Compute Project 混淆，后来在 OSCON 会议上宣布更名为开放容器计划（Open Container Initiative）。