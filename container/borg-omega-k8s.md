# 7.1 从 Borg 到 Kubernetes

近几年，业界对容器技术兴趣越来越大，大量的公司开始逐步将虚拟机替换成容器。

实际上，早在十几年前，Google 内部，就已开始大规模的实践容器技术了。实践过程中，Google 先后设计了三套不同的容器管理系统（Borg、Omega 和 Kubernetes）。在此期间，Google 向外界分享了大量的源码、论文和设计思想，直接促进了容器技术的普及和发展，对整个行业的技术演进产生了深远的影响。

## 7.1.1 Borg 系统
Google 内部第一代容器管理系统叫 Borg。

Borg 的架构如图 7-1 所示，是典型的 Master（图中 BorgMaster) + Agent（图中的 Borglet）架构。

用户通过命令行或者浏览器将任务提交给 BorgMaster，BorgMaster 负责记录“某某任务运行在某某节点上”这类元信息，然后节点中的 Borglet 与 BorgMaster 通信，获取分配给自己的任务，在节点操作容器执行具体的任务。

:::center
  ![](../assets/borg-arch.png)<br/>
  图 7-1 Borg 架构图 [图片来源](https://research.google/pubs/large-scale-cluster-management-at-google-with-borg/)
:::

开发 Borg 的过程中，Google 的工程师为 Borg 设计了两种工作负载（Workload）[^1]：
- **长期运行的服务（Long-Running Service）**：通常是对请求延迟敏感的在线业务，例如 Gmail、Google Docs 和 Web 搜索以及内部基础设施服务；
- **批处理任务（Batch Job）**：通常用于一次性地、按批次处理一大批数据或执行一系列任务，涉及大量数据处理，需要较长的运行时间和较多的计算资源。典型的 Batch Job 为 Apache Hadoop 或 Spark 等框架进行的各类离线计算任务。


区分 2 种不同类型工作负载的原因在于：

- **两者运行状态不同**：Long-Running Service 存在“环境准备ok，但进程没有启动”、“健康检查失败”等状态，这些状态 Batch Job 是没有的。运行状态不同，决定了两类应用生命周期管理、监控、资源分配操作的不同；
- **关注点与优化方向不一样**：一般而言，Long-Running Service 关注的是服务的“可用性”，而 Batch Job 关注的是系统的整体吞吐。关注点的不同，会进一步导致内部实现的分化。

在 Borg 系统中，大多数长期运行的服务（Long-Running Service）被赋予高优先级（此类任务在 Borg 中称为 "prod"），而批处理任务（Batch Job）则被赋予低优先级（此类任务在 Borg 中称为 "non-prod"）。在实际生产环境中，高优先级任务享有优先分配和占用大部分 CPU 和内存资源的特权。Borg 的任务优先级设计基于“资源抢占”模型，即高优先级的 prod 任务可以抢占低优先级的 non-prod 任务所占用的资源。

这一设计的底层技术由 Google 贡献给 Linux 内核的 cgroups 支撑。cgroups 是容器技术的基础之一，提供了对网络、计算、存储等各类资源的隔离（7.2 节，笔者将详细介绍 cgroups 技术）。Borg 通过 cgroups 技术，实现了不同类型工作负载的混合部署，使其能够共享主机资源而互不干扰。Google 的运维结果表明，Borg 系统显著提升了资源利用率，降低了硬件成本。

随着 Google 内部越来越多的应用程序被部署到 Borg 上，应用团队与基础架构团队开发了大量围绕 Borg 的管理工具和服务，如资源需求预测、自动扩缩容、服务发现与负载均衡、监控系统（Brogmon，Prometheus 的前身）等，并逐渐形成了基于 Borg 的内部生态系统。

## 7.1.2 Omega 系统

Borg 生态的发展由 Google 内部不同团队推动。从迭代结果来看，Borg 生态是一系列异构且自发形成的工具和系统，而不是一个精心设计的整体架构。

为使 Borg 生态更符合软件工程规范，Google 在汲取 Borg 设计与运维经验的基础上开发了 Omega 系统。相比 Borg，Omega 的最大改进是将 BorgMaster 的功能拆分为多个交互组件，而不再是一个单体、中心化的 Master。此外，Omega 还显著提升了大规模集群的任务调度效率：

- Omega 基于 Paxos 算法实现了一套分布式一致性和高可用的键值存储（内部称为 Store），集群的所有状态都保存在 Store 中；
- 拆分后的组件（如容器编排调度器、中央控制器）可以直接访问 Store；
- 基于 Store，Omega 提出了一种共享状态的双循环调度策略，解决了大规模集群的任务调度效率问题。此设计反哺了 Borg 系统（详见本章 7.7.4 节）。


如图 7-2 所示，改进后的 Borg 与 Omega 系统成为 Google 整套基础设施最核心的依赖。

:::center
  ![](../assets/Borg.jpeg) <br/>
  图 7-2 Borg 与 Omega 是 Google 最关键的基础设施 [图片来源](https://cs.brown.edu/~malte/pub/dissertations/phd-final.pdf)
:::

## 7.1.3 Kubernetes 系统

Google 开发的第三套容器管理系统是 Kubernetes，其背景如下：

- 全球越来越多的开发者开始对 Linux 容器产生兴趣（尽管 Linux 容器是 Google 的技术基础，但开发者们首先想到的是 Docker，Google 并没有吃到红利）。
- 同时，Google 已将公有云基础设施作为业务重点并实现持续增长（虽然 Google 提出了云计算的概念，但市场领先者已被 AWS 和阿里云占据，Google 起了大早赶了个晚集）。

2013 年夏，Google 的工程师们开始讨论如何借鉴 Borg 的经验开发新一代容器编排系统。并希望通过十几年的技术积累影响云计算市场格局。Kubernetes 项目获批后，Google 于 2014 年 6 月的 DockerCon 大会上正式宣布将其开源。

通过图 7-3 观察 Kubernetes 架构，能看出大量设计来源于 Borg/Omega 系统：

- Master 系统由多个分布式组件构成，包括 API Server、Scheduler、Controller Manager 和 Cloud Controller Manager；
- Kubernetes 的最小运行单元 Pod，其原型是 Borg 系统中的 Alloc（资源分配的缩写）；
- 工作节点上的 kubelet 组件，其设计来源于 Borg 系统中的 Borglet 组件；
- 基于 Raft 算法实现的分布式一致性键值存储 Etcd，对应 Omega 系统中基于 Paxos 算法实现的 Store。

:::center
  ![](../assets/k8s-arch.svg)<br/>
  图 7-3 Kubernetes 架构以及组件概览 [图片来源](https://link.medium.com/oWobLWzCQJb)
:::


出于降低用户使用的门槛，并最终达成 Google 从底层进军云计算市场意图，Kubernetes 定下的设计目标是**享受容器带来的资源利用率提升的同时，让部署和管理复杂分布式系统的基础设施标准化且更简单**。

为了进一步理解基础设施的标准化，来看 Kubernetes 从一开始就提供的东西——用于描述各种资源需求的标准 API：

- 描述 Pod、Container 等计算资源需求的 API；
- 描述 Service、Ingress 等网络功能的 API；
- 描述 Volumes 之类的持久存储的 API；
- 甚至还包括 Service Account 之类的服务身份的 API 等等。

各云厂商已经将 Kubernetes 结构和语义对接到它们各自的原生 API 上，所以 Kubernetes 描述资源需求的 API 是跨公有云、私有云和各家云厂商的，也就是说只要基于 Kubernetes 的规范管理应用，那么应用就能无缝迁移到任何云中。

**提供一套跨厂商的标准结构和语义来声明核心基础设施（Pod、Service、Volume...）是 Kubernetes 设计的关键，在此基础上，它又通过 CRD（Custom Resource Define，自定义资源定义） 将这个设计扩展到几乎所有的基础设施资源**。

有了 CRD，用户不仅能声明 Kubernetes API 预定义的计算、存储、网络服务，还能声明数据库、Task Runner、消息总线、数字证书等等任何云厂商能想到的东西！随着 Kubernetes 资源模型越来越广泛的传播，现在已经能够用一组 Kubernetes 资源来描述一整个软件定义计算环境。

就像用 docker run 可以启动单个程序一样，现在用 kubectl apply -f 就能部署和运行一个分布式应用，而无需关心是在私有云、还是公有云或者具体哪家云厂商上。

## 7.1.4 以应用为中心的转变

从最初的 Borg 到 Kubernetes，**容器化技术的最大的益处早就超越了单纯提高资源使用率的范畴**；**更大的变化在于，系统开发和运营的理念从以机器为中心迁移到了以应用为中心**。

容器化使系统运营观念从原来的面向机器向了面向应用：

1. 容器封装了应用环境，屏蔽了操作系统和机器的细节，使应用开发者和基础设施管理者不再关注底层细节；
2. 每个设计良好的容器或容器镜像通常对应一个应用，管理容器即是管理应用，而非管理机器。

正是因为以应用为中心，云原生技术体系才会无限强调让基础设施能更好的配合应用、以更高效方式为应用输送基础设施能力：

1. 开发者和运维团队无需再关心机器、操作系统等底层细节；
2. 基础设施团队引入新硬件和升级操作系统更加灵活，最大限度减少对线上应用和应用开发者的影响；
3. 将收集到的各类关键性能指标（如 CPU 使用率、内存用量、每秒查询率 QPS 等）与应用程序而非物理机器关联起来，显著提高了应用监控的精确度和可观测性，尤其是在系统垂直扩容、机器故障或主动运维等场景。这直接促使软件可观测性领域应运而生。


[^1]: 在 Kubernetes 中的 Workload 资源包括多种类型，例如 Deployment、StatefulSet、DaemonSet、ReplicaSet 等等
