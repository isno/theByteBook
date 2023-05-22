# OCI in Docker

自从 2013 年 docker 发布之后，docker 项目本身逐渐成为了一个庞然大物。为了能够降低项目维护的成本，促进行业发展，docker 公司提出了 “基础设施管道宣言” (Infrastructure Plumbing Manifesto)，并分成了多个模块以适应 OCI 标准。

从 Docker 1.11 版本开始，Docker 容器运行就不是简单通过 Docker Daemon 来启动了, 而是被分成了多个模块以适应 OCI 标准。现阶段的 Docker 通过集成 Containerd、containerd-shim、runC 等多个组件共同完成。

其中 containerd 是 CRI 的一种实现，是一个工业标准的容器运行时，几乎囊括了单机运行一个容器运行时所需要的一切：执行，分发，监控，网络，构建，日志等。 而 runC 则是 OCI 参考实现，是一个轻量可移植的容器运行时，包括了所有之前 docker 所使用的容器相关的与系统特性的代码，它的目标是：make standard containers available everywhere。

containerd-shim 是 containerd 和 runC 之间的中间层， 每启动一个容器都会创建一个新的 containerd-shim 进程，指定容器 ID，Bundle 目录，运行时的二进制（比如 runc）


于是，现代 docker 的架构流程图，已如下所示：

<div  align="center">
	<img src="../assets/docker-arc.png" width = "550"  align=center />
</div>