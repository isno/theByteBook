# 7.3 容器标准化项目 OCI

Docker 公司的出现可以说是容器技术的重要里程碑，它率先推动了容器技术的普及，并拉开了云原生应用变革的序幕。

随着时间的推移，云计算和云平台的成熟，越来越多的用户开始重视在云端开发、部署和运维应用的效率。为了确保不同容器运行时都能够运行任何构建工具生成的镜像，Linux 基金会与一些顶级科技公司如 Google、华为、惠普、IBM、Docker、Red Hat 和 VMware 共同成立了开放容器倡议 OCI（Open Container Initiative，开放容器计划）。

OCI 的目标是制定容器镜像格式和运行时的行业标准，使得任何支持 OCI 运行时标准的容器运行时都可以使用 OCI 镜像来运行容器，促进了容器技术的互操作性和可移植性。


## 7.3.1 OCI

OCI 目前提出的规范有如下：

- Runtime Specification	：运行时规范，主要定义了在不同平台上运行容器的标准流程
- Image Format 镜像规范， 对镜像格式、打包(Bundle)、存储等进行了定义
- Distribution Specification 镜像分发的规范，该规范用于标准化镜像的分发标准，使 OCI 的生态覆盖镜像的全生态链路，从而成为一种跨平台的容器镜像分发标准。


## 7.3.2 OCI in Docker

自从 Docker 发布之后，Docker 项目逐渐成为了一个庞然大物。为了能够降低项目维护的成本，促进行业发展，Docker 公司提出了 “基础设施管道宣言” (Infrastructure Plumbing Manifesto)，并分成了多个模块以适应 OCI 标准。

从 Docker 1.11 版本开始，Docker 容器运行就不是简单通过 Docker Daemon 来启动了, 而是被分成了多个模块，现阶段的 Docker 通过集成 Containerd、containerd-shim、runC 等多个组件共同完成。

其中 containerd 是 CRI 的一种实现，是一个工业标准的容器运行时，几乎囊括了单机运行一个容器运行时所需要的一切：执行，分发，监控，网络，构建，日志等。 而 runC 则是 OCI 参考实现，是一个轻量可移植的容器运行时，包括了所有之前 docker 所使用的容器相关的与系统特性的代码，它的目标是：make standard containers available everywhere。

containerd-shim 是 containerd 和 runC 之间的中间层， 每启动一个容器都会创建一个新的 containerd-shim 进程，指定容器 ID，Bundle 目录，运行时的二进制（比如 runc）


于是，现代 docker 的架构流程图，已如下所示：

<div  align="center">
	<img src="../assets/docker-arc.png" width = "550"  align=center />
</div>


### 1. Docker 镜像 与 OCI 镜像的区别

如果要问 Docker 镜像与 OCI 镜像之间有什么区别，如今的答案是：几乎没有区别。

有一部分旧的 Docker 镜像在 OCI 规范之前就已经存在了，它们被成为 Docker v1 规范，与 Docker v2 规范并不兼容。而 Docker v2 规范捐给了 OCI，构成了 OCI 规范的基础。如今所有的容器镜像仓库、Kubernetes 平台和容器运行时都是围绕 OCI 规范建立。
