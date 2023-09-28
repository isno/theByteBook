# 1.5.1 容器技术

在介绍容器技术之前，我们先聊聊这些虚拟化技术出现的本源是什么。

在我看来，本源是摩尔定律的发展让资源过剩无法充分利用。摩尔定律主张处理器的性能每18个月翻一番，这就意味着我们拥有的计算资源会以惊人的速度递增。然而，应用却无法充分利用这些资源，特别是在每个应用对资源的需求都在变化的情况下。

虚拟化技术的产生，正是为了解决这个问题。通过虚拟化资源隔离技术，一台物理服务器可以被分割成多个虚拟服务器，资源隔离分配让虚拟服务器可以更加高效并且灵活的利用硬件资源。

## 1.早期容器阶段

资源隔离技术有多条路线，我们熟知的操作系统虚拟化（OS virtualization）路线最大的技术贡献来源于Google。2006年，Google推出Process Containers，用来对一组进程进行限制、记账、隔离资源（CPU、内存、磁盘 I/O、网络等），Process Container 在 2006 年正式推出后，第二年就进入了 Linux 内核主干，并正式更名为 Cgroups，标志着 Linux 阵营中“容器”的概念开始被重新审视和实现。

2008 年 Linux Kernel 2.6.24 内核在刚刚开始提供 cgroups 的同一时间，立刻将 Cgroups 的资源管理能力和 Linux Namespace（命名空间）的视图隔离能力组合在一起，形成了完整的容器技术LXC（Linux Container），这就是如今被广泛应用的容器技术的实现基础。

至2013年，Linux虚拟化技术已基本成型，通过cgroups、Namespace以及安全防护机制，已经在大体上解决了容器核心技术中运行环境隔离技术的问题。虽然容器运行环境隔离技术的基础已经基本就位，但我们仍在等待另一项关键技术的出现，才能迎来容器技术的全面繁荣。

## 2.Docker的阶段

2013年之前，云计算行业一直在为云原生发展方向而探索。2008年Google推出GAE（Google App Engine），GAE基于 LXC技术，属于早期PaaS平台的探索，但是这些早期探索技术并没有形成大的行业趋势，局限在一些的特定的领域。

直到Docker开源，大家才如梦方醒，原来不是方向不对，而是应用分发和交付的手段不行。

Docker真正核心的创新是容器镜像（docker image），一种新型的应用打包、分发和运行机制。容器镜像将应用运行环境，包括代码、依赖库、工具、资源文件和元信息等，打包成一种操作系统发行版无关的不可变更软件包。

- 容器镜像打包了整个容器运行依赖的环境，以避免依赖运行容器的服务器的操作系统，从而实现“build once，run anywhere”。
- 容器镜像一但构建完成，就变成read only，成为不可变基础设施的一份子。
- 操作系统发行版无关，核心解决的是容器进程对操作系统包含的库、工具、配置的依赖，但是容器镜像无法解决容器进程对内核特性的特殊依赖。


Docker的宣传口号是“Build，Ship and Run Any App，Anywhere”。

我们已经理解了docker通过container image解决“Run Anywhere”的机制，那么“Run Any App”是如何实现的呢？其实也是依赖container image，用户可以打包任何容器进程所依赖的环境，而不用改造应用来适配PaaS定义的运行环境。“Run Any App”一举打破了PaaS行业面临的困境，创造出了无限的可能性，大力推动了云原生的发展。

<div  align="center">
	<img src="../assets/docker.png" width = "500"  align=center />
	<p>图 Docker的愿景：Build, Ship, and Run Any App, Anywhere</p>
</div>

至此，容器技术体系已经解决了最核心的两个问题：如何发布软件和如何运行软件。至此，云计算进入容器阶段。

## 3.OCI阶段

当容器技术的前景开始显现后，众多公司纷纷投入该领域进行探索。在Docker推出不久之后，CoreOS 推出了自己的容器引擎 Rocket （简称 rkt），试图与 Docker 分庭抗礼。相互竞争的结果就是大家坐下来谈接口标准，避免出现“碎片化”的容器技术。

2015年6月，Docker带头成立OCI（Open Container Initiative），OCI组织着力解决容器的构建、分发和运行问题。

:::tip OCI宗旨
制定并维护容器镜像格式和容器运行时的正式规范（OCI Specifications）”，：
:::

OCI其核心产出是。

1. OCI Runtime Spec（容器运行时规范）
2. OCI Image Spec（镜像格式规范）
3. OCI Distribution Spec（镜像分发规范）。

在 OCI 项目启动后，docker 公司将 libcontainer 的实现移动到 runc 并捐赠给了 OCI。随后 docker 开源并将 containerd 捐赠给了 CNCF。从 Docker 1.11 版本开始，Docker 运行就不是简单通过 Docker Daemon 来启动了，现阶段的 Docker 通过集成 containerd、containerd-shim、runc 等多个组件共同完成。Docker 架构流程图，已如下所示：

<div  align="center">
	<img src="../assets/docker-arc.png" width = "550"  align=center />
</div>

## 4.容器编排阶段

Docker 作为一个单机软件打包、发布、运行系统，其价值是非常巨大的。但仅仅将docker技术局限在单机范围内不能发挥这个创新技术的最大价值。自然下一步业界希望基于docker技术构建一个云化的集群系统，来对业务容器进行编排管理。

尽管早在 2013 年，Pivotal（持有着 Spring Framework 和 Cloud Foundry 的公司）就提出了“云原生”的概念，但是要实现服务化、具备韧性（Resilience）、弹性（Elasticity）、可观测性（Observability）的软件系统依旧十分困难，在当时基本只能依靠架构师和程序员高超的个人能力，云计算本身还帮不上什么忙。直到 Kubernetes 横空出世，大家才终于等到了破局的希望，认准了这就是云原生时代的操作系统，是让复杂软件在云计算下获得韧性、弹性、可观测性的最佳路径，也是为厂商们推动云计算时代加速到来的关键引擎之一。

Kubernetes 发布之后，作为回应，Docker公司在2015年发布的Docker 1.12版本中也加入了一个容器集群管理系统Docker swarm，力图构建完善的容器编排系统，和Kubernetes展开正面竞争，随后又出现了Apache Mesos。

容器编排系统开始出现 Kubernetes，Docker Swarm和Apache Mesos三国并立。在 OCI成立的一个月之后，Google带头成立了Cloud Native Computing Foundation（CNCF）。CNCF组织解决的是应用管理及容器编排问题。

:::tip CNCF宗旨
构建云原生计算 —— 一种围绕着微服务、容器和应用动态调度的、以基础设施为中心的架构，并促进其广泛使用
:::

OCI和CNCF这两个围绕容器的基金会对云原生生态的发展发挥了非常重要的作用，二者不是竞争而是相辅相成（竞争的都已经淹没在历史的长河中），共同制定了一系列行业事实标准。

这些行业事实标准的确立，各行业注入了无限活力，基于接口的标准的具体实现不断涌现，呈现出一片百花齐放的景象。
<div  align="center">
	<img src="../assets/container-2.jpeg" width = "650"  align=center />
	<p>图 容器编排生态</p>
</div>

其中，与容器相关的最为重要的几个规范包括：CRI、CNI、CSI、OCI Distribution Spec、OCI Image Spec、OCI Runtime Spec和Shimv2。

这些标准规范我们也将在本书后续篇节进行深入介绍和实践。