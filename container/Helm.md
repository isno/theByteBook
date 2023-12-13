# Helm 与 Chart

相信读者朋友们都知道 Linux 系统中的包管理工具和封装格式，例如 Debian 系的 apt-get 命令和 dpkg 格式，RHEL 系的 yum 命令和 rpm 格式。在 Linux 系统中，有了这些包管理工具，我们只要知道应用的名称，就可以很方便地从应用仓库中下载、安装、升级、回滚等，而且每个应用依赖哪些前置的第三方库，在安装时都会一并处理好。

如果把 Kubernetes 比作云原生操作系统，那么由 Deis 公司开发的 Helm 就是这个操作系统之上的应用商店和包管理工具。Helm 提出了与 Linux 包管理直接对应的 Chart 格式和 Repository 应用仓库，一种系统性管理和封装 Kubernetes 应用的解决方案，用户不用需要了解 Kubernetes 的 yaml 语法和编写各类复杂的部署文件，只要通过 Helm 一行命令就可以下载并在 kubernetes 上安装需要的应用。

Chart 是 Helm 中的应用格式（RHEL 系 rpm 格式），通常以目录内的文件集合形式封装了 Kubernetes 应用涉及到的所有资源。譬如官方仓库中 WordPress Chart 应用结构如下。

```plain
WordPress
.
├── Chart.lock
├── Chart.yaml
├── README.md
├── templates
│   ├── NOTES.txt
│   ├── _helpers.tpl
│   ├── config-secret.yaml
│   ├── deployment.yaml
│   ├── hpa.yaml
│   ├── svc.yaml
│   └── ...
├── values.schema.json
└── values.yaml
```

Chart 包内有几个固定的配置文件：Chart.yaml 给出了应用自身的详细信息（名称、版本、许可证、自述、说明等），values.yaml 给出了所有可配置项目的预定义值。部署应用时，Helm 会先将管理员设置的值覆盖到 values.yaml 的默认值上，然后以字符串替换的形式传递给 templates 目录的资源模版，最后生成要部署到 Kubernetes 的资源文件。

## Helm 的工作流程

如下图所示， Helm 的工作流程总结如下：

- 开发者首先创建并编辑 chart 配置
- 接着打包并发布到 Helm 的仓库
- 当管理员使用 helm 命令安装时， 相关的依赖会从仓库中下载
- 接着 Helm 会根据下载的配置部署资源到 kubernetes 中

<div  align="center">
	<img src="../assets/helm.webp" width = "500"  align=center />
</div>

从整体来说，Helm 提供了应用生命周期、版本、依赖项的管理功能，同时 Helm 还支持额外的插件扩展，能加加入 CI/CD 或者其他方面的辅助功能。

