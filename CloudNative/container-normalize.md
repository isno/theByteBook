# 理解容器技术及标准化

2013年，Docker公司发布Docker开源项目，提供了一系列简便的工具链来使用容器。毫不夸张地说，Docker公司率先点燃了容器技术的火焰，拉开了云原生应用变革的帷幕，促进容器生态圈一日千里地发展。

后续随着IaaS、PaaS和SaaS等云平台逐渐成熟，用户对云端应用开发、部署和运维的效率不断重视, 2015年，OCI(Open Container Initiative)作为Linux基金会项目成立，旨在推动开源技术社区制定容器镜像和运行时规范，使不同厂家的容器解决方案具备互操作能力。同年还成立了CNCF，目的是促进容器技术在云原生领域的应用，降低用户开发云原生应用门槛

## 从 Docker 说起

从 Docker 1.11 版本开始，Docker 容器运行就不是简单通过 Docker Daemon 来启动了, 而是被分成了多个模块以适应 OCI 标准，现阶段的 Docker 通过集成 Containerd、containerd-shim、runC 等多个组件共同完成。

<div  align="center">
	<img src="../assets/docker-arc.png" width = "550"  align=center />
</div>

其中 containerd 是 CRI（contianer runtime interface：容器管理操作标准） 的一种实现，containerd 是一个工业标准的容器运行时，注重简单、 健壮性、可移植性。 containerd-shim 是 containerd 和 runC 之间的中间层， 而 runC 则是 OCI（开放容器计划）参考实现。


## OCI

OCI（Open Container Initiative，开放容器计划），是在 2015 年由 Docker、CoreOS 等公司共同成立的项目，并由 Linux 基金会进行管理，致力于 container runtime 标准的制定和 runc 的开发等工作。

所谓 container runtime，主要负责的是容器的生命周期的管理。OCI 主要分为容器运行时规范(runtime-spec) 和镜像规范(image-spec) 两部分，runtime-spec 标准对容器的创建、删除、查看、状态等操作进行了定义，image-spec 标准对镜像格式、打包(Bundle)、存储等进行了定义。

<div  align="center">
	<img src="../assets/docker-arc.png" width = "550"  align=center />
</div>


## runC

runC 是标准化的产物，由 Docker 贡献给 OCI 作为OCI 容器运行时标准的参考实现。

runc 直接与容器所依赖的 Cgroup/OS 等进行交互，负责为容器配置 Cgroup/namespace 等启动容器所需的环境，创建启动容器的相关进程。是一个可以用于创建和运行容器的 CLI(command-line interface) 工具。

有了 runC 后, OCI 对容器 runtime 的标准所定义的指定容器的运行状态和 runtime 需要提供的命令得以打通.

runC 有以下特性:

- 构建出的二进制直接调用
- 用于更新 dockerd 配置文件 config.v2.json, hostconfig.json 文件
- 提供了 k8s runtime class
- 与 OCI 交互标准化


## Container Runtime

Container Runtime （容器运行时），对于广义的runtimes，基本有两种观点，其一：runtime是“程序运行时的生命周期状态”，其二：“为了运行特定语言而提供的特定实现和设计”，一个例子就是java hotspot runtime。

而对 container runtime 而言，“为了运行特定语言而提供的特定实现和设计”的这种理解方式无疑是更恰当的。Container runtime 容器运行时顾名思义就是要掌控容器运行的整个生命周期。

容器运行时相当复杂，每个运行时都涵盖了从低级到高级的不同部分，如下图所示：

<div  align="center">
	<img src="../assets/container-runtime.png" width = "350"  align=center />
</div>

通常只关注正在运行的容器的实际Container Runtime通常称为“low-level container runtimes”。支持更多高级功能（如镜像管理和gRPC/Web API）的运行时通常称为“high-level container runtimes”。

实际应用中，low-level container runtimes和high-level container runtimes如下图所示，按照各自的分工，协作完成容器管理的工作。

<div  align="center">
	<img src="../assets/container-runtime-relative.png" width = "350"  align=center />
</div>


其实high-level container runtime 是通过不同 shim 对接不同的low-level container runtime。比如 containerd 对接 kata-runtime：

<div  align="center">
	<img src="../assets/kata-container.png" width = "400"  align=center />
</div>


### low-level runtime

low-level runtime 关注如何与操作系统交互，创建并运行容器。目前常见的 low-level runtime有：



### High-level runtimes

High-level runtimes相较于low-level runtimes位于堆栈的上层。low-level runtimes负责实际运行容器，而High-level runtimes负责传输和管理容器镜像，解压镜像，并传递给low-level runtimes来运行容器。目前主流的 high-level runtime 有：

- docker
- containerd
- rkt


## CRI

CRI（Container Runtime Interface，容器运行时接口）是 K8s 定义的一组与容器运行时进行交互的接口，用于将 K8s 平台与特定的容器实现解耦。在 K8s 早期的版本中，对于容器环境的支持是通过 Dockershim(hard code) 方式直接调用 Docker API 的，后来为了支持更多的容器运行时和更精简的容器运行时，K8s 在遵循 OCI 基础上提出了CRI。



## shim

Kubernetes是当今主流的容器编排平台，为了适应不同场景的需求，Kubernetes需要有使用不同容器运行时的能力。为此，Kubernetes从1.5版本开始，在kubelet中增加了一个容器运行时接口CRI(Container Runtime Interface)，需要接入Kubernetes的容器运行时必须实现CRI接口。由于kubelet的任务是管理本节点的工作负载，需要有镜像管理和运行容器的能力，因此只有高层容器运行时才适合接入CRI。


CRI和容器运行时之间需要有个接口层，通常称之为shim(垫片)，用以匹配相应的容器运行时

## CRI shim

当前实现了 CRI 的 remote shim 有如下：

- containerd：由 Docker 公司创建，并且在 2017 年捐赠给了 CNCF，2019 年毕业。
- CRI-O：基于 OCI 规范的作为 CRI 和 OCI 之间的一座桥梁。
- Docker Engine：Docker 运行时的支持，由 cri-dockerd 进行实现。
- Mirantis Container Runtime：Docker 企业版(Enterprise Edition) 运行时的支持，由 Mirantis Container Runtime(MCR) 进行实现。

<div  align="center">
	<img src="../assets/K8s-CRI-shim.png" width = "380"  align=center />
</div>


## RuntimeClass

RuntimeClass 是 v1.12 引入的新 API 对象，用来支持多个容器运行时，可通过 Pod 字段直接指定。 定义一个 RuntimeClass 如下，对应的 CRI handler 即为目标容器运行时，比如 containerd、crio：

```
apiVersion: node.k8s.io/v1  # RuntimeClass is defined in the node.k8s.io API group
kind: RuntimeClass
metadata:
  name: myclass  # The name the RuntimeClass will be referenced by
  # RuntimeClass is a non-namespaced resource
handler: myconfiguration  # The name of the corresponding CRI configuration

```

