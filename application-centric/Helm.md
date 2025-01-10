# 10.3.2 Helm

相信读者朋友们知道 Linux 下的包管理工具和封装格式， 如 Debian 系的 apt-get 命令和 dpkg 格式、RHEL 系的 yum 命令和 rpm 格式。在 Linux 系统中，有了包管理工具，我们只要知道应用的名称，就可以很方便地从应用仓库中下载、安装、升级、回滚等，而且包管理工具掌握着应用的依赖信息和版本变更情况，具备完整的自管理能力，每个应用依赖哪些前置的第三方库，在安装时都会一并处理好。

Helm 借鉴了各大 Linux 发行版的应用管理方式，引入了与 Linux 包管理对应的 Chart 格式和 Repository 仓库概念。对于用户而言，使用 Helm 无需了解 Kubernetes 的 YAML 语法或编写部署文件，只需一行命令，即可在 Kubernetes 集群内安装所需应用。

Chart 是一个包含描述 Kubernetes 相关资源的文件集合，例如 WordPress chart 的目录结构是这样子的：

```bash
WordPress
.
├── Chart.lock
├── Chart.yaml
├── README.md
├── templates
│   ├── NOTES.txt
│   ├── _helpers.tpl
│   ├── config-secret.yaml
│   ├── deployment.yaml
│   ├── hpa.yaml
│   ├── svc.yaml
│   └── ...
├── values.schema.json
└── values.yaml
```

其中 Chart.yaml 是元数据文件，包含了 Chart 的名称、版本、描述等信息。values.yaml 是默认的配置文件，定义了 Chart 中变量的默认值。用户可以通过自定义 values.yaml 或通过命令行参数覆盖这些默认值。templates 目录包含 Kubernetes YAML 配置文件的模板，这些模板通过 Go 的模板引擎进行渲染，生成最终的 Kubernetes 资源定义文件。

Repository 是存储、共享 Chart 的地方。Helm 项目团队开发和维护了最大的公共仓库是 artifacthub，上面托管了托管了成千上万 Chart 应用。除了公共仓库，用户也可以创建私有的 Helm 仓库，用来存储内部开发的 Charts。

如下图所示，开发者和运维人员将应用程序及其依赖项打包成 Chart。用户使用 helm install 命令快速部署应用，无需再手动编写大量的 YAML 配置文件。

:::center
  ![](../assets/helm.webp)<br/>
  图 7-1 Tekton Dashboard
:::

Helm 主要目标是通过 Charts 模板化定义 Kubernetes 资源，简化应用的部署和管理。它侧重于配置相对固定、生命周期简单的应用，提供安装、升级、回滚和卸载等粗粒度的基本操作。但对于复杂的有状态应用，比如数据库类的应用，管理还涉及数据备份、分区重平衡、数据迁移等细粒度操作，这些超出了 Helm 的设计范畴。这些正是稍后介绍的 Operator 要解决的问题。

