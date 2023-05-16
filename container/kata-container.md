# 安全容器方案：Kata Containers 

尽管容器有许多技术优势，但容器有一个不可忽视的安全问题 - **容器与宿主机共享内核**，共享内核除了存在稳定性问题外，还容易导致安全风险。

## 容器安全问题

理论上，如果您在单个主机上部署了多个容器，一旦其中某个容器被恶意代码利用，由于共享 namespace，该主机上的其他所有容器也容易受到攻击，在这种情况下，可能会对云基础设施整体构成严重的安全威胁，如果是公有云服务，安全威胁很可能会波及到其他用户的数据和业务。

公有云中，运维人员通常将容器“嵌套”在虚拟机中，从逻辑上将其与运行在同一主机上的其他进程隔离开，但在虚拟机中运行容器会丧失容器的速度和敏捷性优势，那么有没有一种折中的方案呢？ 当然，那就是 Kata Containers。

## 安全容器方案 Kata Containers

Kata Containers  是由 OpenStack 基金会管理的容器项目。 它整合了 Intel Clear Containers 和 Hyper runV。通过轻量型虚拟机技术构建一个安全的容器运行时，表现像容器一样，但通硬件虚拟化技术提供强隔离，解决了 容器中 共享内核的安全问题。

Kata Containers 安全容器的诞生解决了许多普通容器场景无法解决的问题，例如多租户安全保障、不同 SLO 混部容器混合部署、可信&不可信容器混合部署等等。在这些优势的基础上，安全容器在虚拟化上也追求极致的轻薄，从而让整体资源消耗和弹性能力接近 runC 容器方案，以此达到 Secure as VM、Fast as Container 的技术目标


<div  align="center">
	<img src="../assets/kata-container-diff.png" width = "550"  align=center />
</div>


## Kata Containers in  Kubernetes

Kata Containers  运行符合 OCI 规范，这也意味着 Kata Containers 可以直接运行 Docker 制作的镜像，同时 Kata Containers  还兼容 Kubernetes CRI 规范


Kata Containers  通过虚拟机作为进程隔离环境之后，原生就带有 Kubernetes Pod， 也就是说 Kata Containers  启用的虚拟机就是一个 Pod，虚拟机里面的进程共享网络空间。

为了高效地和 Kubernetes CRI 集成， 新版的 Kata-Container 为了缩短容器的调用链直接将 Containerd-shim 和 kata-shim 以及 kata-proxy 融合到一起。

CRI 和 Kata Containers 的集成下图所示：


<div  align="center">
	<img src="../assets/kata-container.png" width = "600"  align=center />
</div>