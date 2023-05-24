# 容器运行时

对于 runtime 其中一个理解是：“为了运行特定语言而提供的特定实现和设计”，再具体到 container runtime ，就是容器整个生命周期的设计和实现。容器运行时相当复杂，每个运行时都涵盖了从低级到高级的不同部分，如下图所示：

<div  align="center">
	<img src="../assets/container-runtime.png" width = "350"  align=center />
</div>

以 Docker 为例，其作为一个整体 container runtime 实现，主要提供的功能如下：

- 制定容器镜像格式
- 构建容器镜像
- 运行容器
- ...

目前较为流行说法将容器运行时分成了 low-level 和 high-level 两类，通常只关注正在运行的容器的 Container Runtime 称为“low-level container runtime”（低层运行时）。而支持更多高级功能（如镜像管理和gRPC/Web API）的运行时通常称为“high-level container runtime”（高层运行时）。

两类运行时按照各自的分工，协作完成容器管理的工作。

<div  align="center">
	<img src="../assets/container-runtime-relative.png" width = "280"  align=center />
</div>




