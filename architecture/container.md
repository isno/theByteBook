# 1.5.1 容器技术

虽然容器概念是在 Docker 出现以后才开始在全球范围内火起来的，并把容器技术推向了巅峰，但容器技术却不是从 Docker 诞生的。实际上，容器技术连新技术都算不上，在 Docker 之前，就已经有无数先驱在探索这一极具前瞻性的虚拟化技术。

在本节，我们概览容器技术发展演进历程以及各个阶段所试图解决的问题。

## 1.早期容器阶段

容器主要的特性之一就是进程隔离，早在 1979 年，贝尔实验室在 Unix V7 的开发过程中，发现当一个系统软件编译和安装完成后，整个测试环境的变量就会发生改变，如果要进行下一次构建、安装和测试，就必须重新搭建和配置测试环境。要知道在那个年代，一块 64K 的内存条就要卖 419 美元，“快速销毁和重建基础设施”的成本实在是太高了。

开发者们开始思考，能否在现有的操作系统环境下，隔离出一个用来重构和测试软件的独立环境？于是，一个叫做 chroot（Change Root）的系统调用功能就此诞生。

chroot 被认为是最早的容器化技术之一，chroot 可以重定向进程及其子进程的 root 目录到文件系统上的新位置，也就是说使用它可以分离每个进程的文件访问权限，使得该进程无法接触到外面的文件，因此这个被隔离出来的新环境也得到了一个非常形象的命名，叫做 Chroot Jail （监狱）。


## 2.LXC 阶段

2006年，Google 推出 Process Container（进程容器） 用来对一组进程进行限制、记账、隔离资源（CPU、内存、磁盘 I/O、网络等），Process Container 在 2006 年正式推出后，第二年就进入了 Linux 内核主干。由于 Container 这一命名在 Kernel 具有许多不同的含义，所以为了避免代码命名的混乱，就将 Process Container 更名为了 Control Groups，简称：cgroups。

2008 年 Linux kernel 2.6.24 在刚刚开始提供 cgroups 的同一时间，社区开发者将 cgroups 的资源管理能力和 Linux namespace（命名空间）的资源隔离能力组合在一起，形成了完整的容器技术 LXC（Linux Container），这就是如今被广泛应用的容器技术的实现基础。

至2013年，Linux 虚拟化技术已基本成型，通过 cgroups、namespace 以及安全防护机制，已经在大体上解决了容器核心技术中运行环境隔离技术的问题。虽然容器运行环境隔离技术的基础已经基本就位，但仍需等待另一项关键技术的出现，才能迎来容器技术的全面繁荣。

## 3.Docker 阶段

2013年之前，云计算行业一直在为云原生发展方向而探索。2008年 Google 推出 GAE（Google App Engine），GAE 基于 LXC 技术，属于早期 PaaS 平台的探索，但是这些早期探索技术并没有形成大的行业趋势，局限在一些的特定的领域。直到 Docker 的出现，大家才如梦方醒，原来不是方向不对，而是应用分发和交付的手段不行。

Docker 真正核心的创新是容器镜像（container image）：

- 容器镜像打包了整个容器运行依赖的环境，以避免依赖运行容器的服务器的操作系统，从而实现“build once，run anywhere”。
- 容器镜像一但构建完成，就变成read only，成为不可变基础设施的一份子。
- 操作系统发行版无关，核心解决的是容器进程对操作系统包含的库、工具、配置的依赖，但是容器镜像无法解决容器进程对内核特性的特殊依赖。

容器镜像将应用运行环境，包括代码、依赖库、工具、资源文件和元信息等，打包成一种操作系统发行版无关的不可变更软件包么，从而实现一种新型的应用打包、分发和运行机制。

Docker 的宣传口号是“Build，Ship and Run Any App，Anywhere”，如图1-15所示。开发者基于镜像可以打包任何容器进程所依赖的环境，而不用改造应用来适配 PaaS 定义的运行环境，“Run Any App”一举打破了 PaaS 行业面临的困境，创造出了无限的可能性，大力推动了云原生的发展。

<div  align="center">
	<img src="../assets/docker.png" width = "500"  align=center />
	<p>图1-15 Docker的愿景：Build, Ship, and Run Any App, Anywhere</p>
</div>

至此，容器技术体系已经解决了最核心的两个问题：如何发布软件和如何运行软件，云计算进入容器阶段。

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