# 容器运行时

Container Runtime 简单来理解就是：容器从拉取镜像到启动运行再到中止的整个生命周期。

根据Runtime实现，可以划分为两种： low-level runtime （低层运行时）和 high-level runtime （高层运行时）。

## low-level runtime

低层容器运行时主要关注如何与操作系统交互，使用 namespace 和 cgroup 实现资源隔离和限制，根据指定的容器镜像创建并运行容器进行，并对容器的整个生命周期进行管理。

目前常见的 low-level runtime有：

- **runc** 传统的运行时，也是目前应用最广泛的运行时，基于 Linux Namespace 和 Cgroups 实现
- **runv** 基于虚拟机管理程序的运行时，通过虚拟化 guest kernel，将容器与宿主机隔离，使其边界更加清晰，代表实现 kata Container
- **rusc** runc + safety，通过拦截应用程序的系统调用，而提供安全隔离的轻量级容器运行时沙箱，代表实现为 Google 的 gVisor

## high-level runtime

负责传输和管理容器镜像、解压镜像，并传递给low-level runtimes来运行容器，目前主流的 high-level runtime 有 containerd CRI-O 。

<div  align="center">
	<img src="../assets/runtime.png" width = "550"  align=center />
</div>