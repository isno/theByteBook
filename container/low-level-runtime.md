# 7.5.1 低层运行时

低层容器运行时（Low Level Container Runtime）主要关注如何与操作系统交互，使用 Namespace 和 Cgroups 实现资源隔离和限制，根据指定的容器镜像创建并运行容器进行，并对容器的整个生命周期进行管理。

一个最基本的低层容器运行时需要做的包括：Create cgroup、 Run command(s) in cgroup、Unshare to move to its own namespaces 等基本工作。

目前常见的低层运行时实现有：

- **runc** 目前应用最广泛的运行时，基于 Linux Namespace 和 Cgroups 实现。
- **crun** runc 的另一种替代品，比 runc 更快，内存效率更高，兼容 OCI 运行时。考虑它是红帽的产品，未来很有可能成为 CRI-O 的默认配置。
- **runv** 基于虚拟机管理程序的运行时，通过虚拟化 guest kernel，将容器与宿主机隔离，使其边界更加清晰，代表实现 kata Containers。
- **rusc** runc + safety，通过拦截应用程序的系统调用，而提供安全隔离的轻量级容器运行时沙箱，代表实现为 Google 的 gVisor。