# 7.5.2 高层容器运行时

低层运行时负责实际运行容器，而高层运行时（High Level Container Runtime）则负责容器映像的传输和管理，解压缩映像，然后传递到低级运行时以运行容器。

目前主流的高层容器运行时有 containerd 、CRI-O 等。

<div  align="center">
	<img src="../assets/runtime.png" width = "550"  align=center />
</div>

## 1. 工业级标准容器运行时 containerd

containerd 是一个从 Docker 项目中分离出来的高层运行时，之后 containerd 被捐赠给云原生计算基金会（CNCF）为容器社区提供创建新容器解决方案的基础。

containerd 实现了 CRI 规范，作为一个轻量级的容器运行时，containerd 旨在嵌入到更大的系统中，containerd 可以在 Docker 嵌入使用，也可以与 Kubernetes、Swarm 等容器编排工具集成使用，

<div  align="center">
	<img src="../assets/containerd-cri-plugin.png" width = "600"  align=center />
</div>


containerd 强调简单性、健壮性和可移植性，它可以完成下面这些功能：

- 容器生命周期管理（从创建到销毁容器）
- 拉取/上传容器镜像
- 管理镜像及容器数据的存储
- 启动、停止、重启容器
- 建立和管理容器网络

## 2. Kubernetes 的轻量级容器运行时 CRI-O

CRI-O 是一个由 redhat 发起并开源且由社区驱动的容器运行时，CRI-O 目标是让 kubelet 与运行时直接对接，减少任何不必要的中间层开销。CRI-O 运行时可以替换为任意 OCI 兼容的 Runtime，镜像管理，存储管理和网络均使用标准化的实现。

<div  align="center">
	<img src="../assets/k8s-cri-o.png" width = "450"  align=center />
</div>


### 2.1 CRI-O 工作流程

CRI-O 架构组合了很多开源的基础组件，下面我们结合 Kubernetes，来看一下CRI-O的工作流程：

<div  align="center">
	<img src="../assets/cri-o.png" width = "500"  align=center />
</div>

- Kubernetes 通知 kubelet 启动一个 pod。
- kubelet 通过 CRI 将请求转发给 CRI-O Daemon。
- CRI-O 利用 containers/image 库从镜像仓库拉取镜像。
- 下载好的镜像被解压到容器的根文件系统中，并通过 containers/storage 库存储到 COW 文件系统中。
- 为容器创建 rootfs 之后，CRI-O 通过 oci-runtime-tool 生成一个 OCI 运行时规范 json 文件，描述如何使用 OCI Generate tools 运行容器。
- 然后 CRI-O 启动一个兼容 CRI 的运行时（默认 runc）来运行容器进程。
- 每个容器都由一个独立的 conmon 进程监控，conmon 为容器中 pid 为 1 的进程提供一个 pty。同时它还负责处理容器的日志记录并记录容器进程的退出代码。
- 网络是通过 CNI 接口设置的，所以任何 CNI 插件都可以与 CRI-O 一起使用。

### 2.2 受信/非受信容器混合

CRI-O 最出名的特点是它支持“受信容器”和“非受信容器”的混合工作负载。例如 CRI-O 可以使用 Clear Containers 做强隔离，这样在多租户配置或者运行非信任代码时很有用。

以下为只实现了 OCI 标准的容器，但可以通过 CRI-O 来作为 Kubernetes 间接使用 OCI 兼容的容器运行时。

- Clear Containers：由 Intel 推出的兼容 OCI 容器运行时，可以通过 CRI-O 来兼容 CRI。
- Kata Containers：符合 OCI 规范，可以通过 CRI-O 或 containerd CRI Plugin 来兼容 CRI。
- gVisor：由谷歌推出的容器运行时沙箱 (Experimental)，可以通过 CRI-O 来兼容 CRI。
