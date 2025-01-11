# 10.3.2 Helm

相信读者朋友们知道 Linux 下的包管理工具和封装格式， 如 Debian 系的 apt-get 命令和 dpkg 格式、RHEL 系的 yum 命令和 rpm 格式。在 Linux 系统中，有了包管理工具，我们只要知道应用的名称，就可以从应用仓库中下载、安装、升级、回滚等，而且包管理工具掌握着应用的依赖信息和版本变更情况，具备完整的自管理能力，每个应用依赖哪些前置的第三方库，在安装时都会一并处理好。

Helm 借鉴了各大 Linux 发行版的应用管理方式，引入了与 Linux 包管理对应的 Chart 格式和 Repository 仓库概念。对于用户而言，使用 Helm 无需手动编写部署文件、无需了解 Kubernetes 的 YAML 语法，只需一行命令，即可在 Kubernetes 集群内安装所需应用。

Chart 是一个包含描述 Kubernetes 相关资源的文件集合，比如官方仓库中 WordPress Chart 的目录结构是这样的：

```bash
WordPress
 |—— charts                           // 存放依赖的chart
 ├── templates                        // 存放应用一系列 k8s 资源的 yaml 模板，通过渲染变量得到部署文件
 │     ├── NOTES.txt                  // 为用户提供一个关于 chart 部署后使用说明的文件
 |     |—— _helpers.tpl               // 存放能够复用的模板
 │     ├── deployment.yaml
 │     ├── externaldb-secrets.yaml
 │     └── ingress.yaml
 │     └── ....
 └── Chart.yaml                       // chart 的基本信息（名称、版本、许可证、自述、说明、图标，等等）
 └── requirements.yaml                // 应用的依赖关系，依赖项指向的是另一个应用的坐标（名称、版本、Repository 地址）
 └── values.yaml                      // 存放全局变量， templates 目录中模板文件中用到变量的值
```

其中 Chart.yaml 是元数据文件，包含了 Chart 的名称、版本、描述等信息。values.yaml 是默认的配置文件，定义了 Chart 中变量的默认值。用户可以通过自定义 values.yaml 或通过命令行参数覆盖这些默认值。templates 目录包含 Kubernetes YAML 配置文件的模板，这些模板通过 Go 的模板引擎进行渲染，生成最终的 Kubernetes 资源定义文件。

Repository 是存储、共享 Chart 的地方。Helm 项目团队开发和维护了最大的公共仓库是 artifacthub，上面托管了托管了成千上万 Chart 应用。除了公共仓库，用户也可以创建私有的 Helm 仓库，用来存储内部开发的 Charts。

如下图所示，开发者和运维人员将应用程序及其依赖项打包成 Chart。用户使用 helm install 命令部署应用，helm 命令从 Chart Repository 中下载 Helm Chart 包，读取 kubeconfig 文件，构建 kube-apiserver REST API 接口的 HTTP 请求。通过调用 Kubernetes 提供的 REST API 接口，将 Chart 包中包含的所有以 YAML 格式定义的 Kubernetes 资源，在 Kubernetes 集群中创建。这些资源以 Release 的形式存在于 Kubernetes 集群中，每个 Release 又包含多个 Kubernetes 资源，例如 Deployment、Pod、Service 等。

:::center
  ![](../assets/helm.webp)<br/>
  图 7-1 Tekton Dashboard
:::

Helm 主要目标是通过 Charts 模板化定义 Kubernetes 资源，简化应用的部署和管理。它侧重于配置相对固定、生命周期简单的应用，提供安装、升级、回滚和卸载等粗粒度的基本操作。但对于复杂的有状态应用（如数据库），管理不仅涉及基础操作，还包括数据备份、扩缩容、分区重平衡、数据迁移等细粒度操作。如何解决这些问题，便是接下介绍的 Operator 的课题。

