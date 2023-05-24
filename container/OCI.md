# 容器标准化项目 OCI

2013年，Docker inc 发布 Docker 开源项目，提供了一系列简便的工具链来使用容器。

毫不夸张地说，Docker 公司率先点燃了容器技术的火焰，拉开了云原生应用变革的帷幕，促进容器生态圈一日千里地发展。

后续随着 IaaS、PaaS 和 SaaS 等云平台逐渐成熟，用户对云端应用开发、部署和运维的效率不断重视, 2015年，容器行业标准项目 OCI 作为 Linux 基金会项目成立，旨在推动开源技术社区制定容器镜像和运行时规范，使不同厂家的容器解决方案具备互操作能力。

同年还成立了 CNCF，目的是促进容器技术在云原生领域的应用，降低用户开发云原生应用门槛，容器技术已经进入了百花齐放的时代。

## OCI

OCI（Open Container Initiative，开放容器计划），是在 2015 年由 Docker、CoreOS 等公司共同成立的项目，并由 Linux 基金会进行管理，致力于围绕容器格式和运行时创建开放的行业标准。

OCI 目前提出的规范有如下：

- Runtime Specification	
- Image Format	
- Distribution Specification	

Image Format（镜像规范）对镜像格式、打包(Bundle)、存储等进行了定义。Runtime Specification（运行时规范）对镜像运行时的规范，它定义了利用镜像的Artifact在不同的平台上运行容器的标准流程。在 OCI 标准下，运行一个容器的过程就是下载一个 OCI 的镜像，将其解压到某个 Filesystem Bundle 中，然后某个 OCI Runtime 就会运行这个 Bundle。

而 Distribution Specification 则是镜像分发的规范，该规范用于标准化镜像的分发标准，使 OCI 的生态覆盖镜像的全生态链路，从而成为一种跨平台的容器镜像分发标准。例如，Docker官方镜像仓库、开源仓库方案 Harbor 等都是符合分发规范的 Registry。



