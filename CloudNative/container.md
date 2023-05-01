# 容器

容器无疑是近年来云计算中最火热的关键词，随着docker的大热，docker、oci、runc、containerd 等等概念也扑之而来，这么多名词，让我们在云原生的开始阶段，总是云里雾里。


## container

那么，什么是容器？ 容器本质上是受到资源限制，彼此间相互隔离的若干个linux进程的集合。一般来说，容器技术主要指代用于资源限制的cgroup，用于隔离的namespace，以及基础的linux kernel等。

## OCI（Open Container Initiative）

OCI是由多家公司共同成立的项目，并由linux基金会进行管理，目前主要有两个标准文档：容器运行时标准 （runtime spec）和 容器镜像标准（image spec）。


**container runtim** 主要负责的是容器的生命周期的管理。oci的runtime spec标准中对于容器的状态描述，以及对于容器的创建、删除、查看等操作进行了定义。

**runc** 是对于OCI标准的一个参考实现，是一个可以用于创建和运行容器的CLI(command-line interface)工具。runc直接与容器所依赖的cgroup/linux kernel等进行交互，负责为容器配置cgroup/namespace等启动容器所需的环境，创建启动容器的相关进程。

为了兼容OCI标准，docker也做了架构调整。将容器运行时相关的程序从docker daemon剥离出来，形成了containerd。Containerd向docker提供运行容器的API，二者通过grpc进行交互。containerd最后会通过runc来实际运行容器。

<div  align="center">
	<img src="../assets/docker-arc.png" width = "550"  align=center />
</div>


## 容器运行时比较

不同类型的容器运行时。通常，它们分为两大类：OCI 运行时和 CRI（容器运行接口）

## 容器运行时接口

