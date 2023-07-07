# 7.5.2 高层运行时

低层运行时负责实际运行容器，而高层运行时（High Level Container Runtime）则负责容器映像的传输和管理，解压缩映像，然后传递到低级运行时以运行容器。

目前主流的高层容器运行时有 containerd 、CRI-O 等。

<div  align="center">
	<img src="../assets/runtime.png" width = "550"  align=center />
</div>

## 1. containerd

containerd 是一个从 Docker 项目中分离出来的高层运行时，之后 containerd 被捐赠给云原生计算基金会（CNCF）为容器社区提供创建新容器解决方案的基础。

containerd 实现了 CRI 规范，作为一个轻量级的容器运行时，containerd 旨在嵌入到更大的系统中，而不是直接由开发人员或最终用户使用，containerd 可以在 Docker 嵌入使用，也可以与 Kubernetes、Swarm 等容器编排工具集成使用，

<div  align="center">
	<img src="../assets/containerd-cri-plugin.png" width = "600"  align=center />
</div>


containerd 强调简单性、健壮性和可移植性，它可以完成下面这些功能：

- 容器生命周期管理（从创建到销毁容器）
- 拉取/上传容器镜像
- 管理镜像及容器数据的存储
- 启动、停止、重启容器
- 建立和管理容器网络
