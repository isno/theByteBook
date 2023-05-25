# 容器标准化项目 OCI

2013年，Docker inc 发布 Docker 开源项目，提供了一系列简便的工具链来使用容器。

毫不夸张地说，Docker 公司率先点燃了容器技术的火焰，拉开了云原生应用变革的帷幕，促进容器生态圈一日千里地发展。

后续随着 IaaS、PaaS 和 SaaS 等云平台逐渐成熟，用户对云端应用开发、部署和运维的效率不断重视, 为了确保所有的容器运行时都能运行任何构建工具生成的镜像，Linux 基金会与 Google，华为，惠普，IBM，Docker，Red Hat，VMware 等公司共同宣布成立开放容器项目（OCP），后更名为开放容器倡议（OCI）。OCI 定义了围绕容器镜像格式和运行时的行业标准，给定一个 OCI 镜像，任何实现 OCI 运行时标准的容器运行时都可以使用该镜像运行容器。

同年还成立了 CNCF，目的是促进容器技术在云原生领域的应用，降低用户开发云原生应用门槛，容器技术已经进入了百花齐放的时代。


## OCI

OCI（Open Container Initiative，开放容器计划），是在 2015 年由 Docker、CoreOS 等公司共同成立的项目，并由 Linux 基金会进行管理，致力于围绕容器格式和运行时创建开放的行业标准。

OCI 目前提出的规范有如下：

- Runtime Specification	
- Image Format	
- Distribution Specification	

Image Format（镜像规范）对镜像格式、打包(Bundle)、存储等进行了定义。Runtime Specification（运行时规范）对镜像运行时的规范，它定义了利用镜像的Artifact在不同的平台上运行容器的标准流程。在 OCI 标准下，运行一个容器的过程就是下载一个 OCI 的镜像，将其解压到某个 Filesystem Bundle 中，然后某个 OCI Runtime 就会运行这个 Bundle。

而 Distribution Specification 则是镜像分发的规范，该规范用于标准化镜像的分发标准，使 OCI 的生态覆盖镜像的全生态链路，从而成为一种跨平台的容器镜像分发标准。例如，Docker官方镜像仓库、开源仓库方案 Harbor 等都是符合分发规范的 Registry。



## Docker 镜像 与 OCI 镜像的区别

如果要问 Docker 镜像与 OCI 镜像之间有什么区别，如今的答案是：几乎没有区别。

有一部分旧的 Docker 镜像在 OCI 规范之前就已经存在了，它们被成为 Docker v1 规范，与 Docker v2 规范并不兼容。而 Docker v2 规范捐给了 OCI，构成了 OCI 规范的基础。如今所有的容器镜像仓库、Kubernetes 平台和容器运行时都是围绕 OCI 规范建立。
