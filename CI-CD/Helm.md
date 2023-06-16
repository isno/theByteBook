# Helm

## 为什么需要 Helm

利用 Kubernetes 部署应用时，会配置大量的资源声明，例如 deployment、RC、HPA、Service 等等，对于一个稍具规模的微服务系统，如果仅使用 kubectl 进行资源管理，就需要修改和维护大量的配置，那么有没有一种便捷的资源管理方式呢？

## Helm 是什么？

很多读者应该都使用过 Ubuntu 下的 ap-get 或者 CentOS 下的 yum, 这两者是 Linux 系统下的包管理工具。采用 apt-get/yum，应用开发者可以管理应用包之间的依赖关系，发布应用；用户则可以以简单的方式查找、安装、升级、卸载应用程序。


我们可以将 Helm 看作 Kubernetes 下的 apt-get/yum，对于应用发布者而言，可以通过 Helm 打包应用，管理应用依赖关系，管理应用版本并发布应用到软件仓库。使用Helm后不用需要了解Kubernetes的Yaml语法并编写应用部署文件，可以通过 Helm 下载并在kubernetes上安装需要的应用。

对于应用发布者而言，可以通过 Helm 打包应用，管理应用依赖关系，管理应用版本并发布应用到软件仓库。

Helm 本质就是 Kubernetes 的包管理器。 对于使用者而言，使用 Helm 后不用需要了解 Kubernetes 的 yaml 语法并编写应用部署文件，可以通过 Helm 下载并在 kubernetes 上安装需要的应用。


总结使用 Helm 可以帮我们解决下面这些问题：

- 高度可配置：Helm Charts 提供了高度可配置的选项，可以轻松自定义和修改应用程序的部署配置
- 版本控制 ：Helm 允许管理应用程序的多个版本，从而轻松实现版本控制和回滚
- 模板化：Helm Charts 使用 YAML 模板来定义 Kubernetes 对象的配置，从而简化了配置过程，并提高了可重复性和可扩展性
- 应用程序库：Helm 具有应用程序库的概念，可以轻松地共享和重用 Helm Charts，从而简化了多个应用程序的部署和管理

## Helm 的概念

在使用Helm之前，我们先需要理解如下几个核心概念

| 概念|描述|
|:--|:--|
|Chart|Helm 的打包格式，内部包含了一组相关的 kubernetes 资源|
|Repoistory| Helm 的软件仓库，用于存储 Charts |
|Release| 在 kubernetes 上运行的 Chart 实例，例如 一个 Redis Chart 想要运行两个实例，可以将 Redis Chart install 两次，并在每次安装生成自己的 Release 以及 Release 名称 |
|Value| Chart 参数，用于配置 kubernetes 对象|
| Template | 使用 Go 模版语言生成的 kubernetes 对象的定义文件 |

## Helm 的工作流程

如下图所示， Helm 的工作流程总结如下：

- 开发者首先创建并编辑 chart 配置
- 接着打包并发布到 Helm 的仓库
- 当管理员使用helm 命令安装时， 相关的依赖会从仓库中下载
- 接着 Helm 会根据下载的配置部署资源到 kubernetes 中

<div  align="center">
	<img src="../assets/helm.webp" width = "500"  align=center />
</div>