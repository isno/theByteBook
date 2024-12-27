# 10.3.2 Helm 

相信读者朋友们知道 Linux 下的包管理工具和封装格式， 如 Debian 系的 apt-get 命令和 dpkg 格式、RHEL 系的 yum 命令和 rpm 格式。在 Linux 系统中，有了包管理工具，我们只要知道应用的名称，就可以很方便地从应用仓库中下载、安装、升级、回滚等，而且包管理工具掌握着应用的依赖信息和版本变更情况，具备完整的自管理能力，每个应用依赖哪些前置的第三方库，在安装时都会一并处理好。

**如果说 Kubernetes 是云原生时代的操作系统，那 Helm 就是这个操作系统之上的应用商店和包管理工具**。Helm 参考了各大 Linux 发行版管理应用的思路，提出了与 Linux 包管理直接对应的 Chart 格式 和 Repoistory 应用仓库的概念。对于使用者而言，使用 Helm 后，不用需要了解 Kubernetes 的 yaml 语法，也不需要编写应用部署文件。只要一行命令，就可以下载并在 kubernetes 上安装需要的应用。


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

其中 Chart.yamlChart 的元数据文件，包含了 Chart 的名称、版本、描述等信息。values.yaml 默认的配置文件，定义了 Chart 中变量的默认值。用户可以通过自定义 values.yaml 或通过命令行参数覆盖这些默认值。templates 目录包含 Kubernetes YAML 配置文件的模板，这些模板通过 Go 的模板引擎进行渲染，生成最终的 Kubernetes 资源定义文件。


如下图所示，开发者和运维人员将复杂的应用程序及其依赖项打包成一个 Chart。用户使用 helm install 命令快速部署应用，无需再手动编写大量的 YAML 配置文件。

:::center
  ![](../assets/helm.webp)<br/>
  图 7-1 Tekton Dashboard
:::

Helm 仓库 是存储和分发 Helm Charts 的地方。用户在 Helm 仓库可以搜索、安装、升级、管理应用程序。用户可以创建和使用私有的 Helm 仓库。

Artifact Hub 是最大的公共 Helm 仓库之一，大量开源项目提供了 Helm Charts，用户可以直接利用这些 Charts 部署生产环境中的应用。





如果说 Docker 是奠定的单实例的标准化交付，那么 Helm 则是集群化多实例、多资源的标准化交付。Helm 将复杂的应用部署简化为几个简单的命令。

Helm 仓库是存储 Helm chart（应用程序的定义和配置包）的地方。默认情况下，Helm 配置了一个稳定的仓库（https://charts.helm.sh/stable），但你也可以添加其他仓库。

如下所示，使用 helm repo add 命令添加一个名为bitnami的仓库：

```bash
$ helm repo add bitnami https://charts.bitnami.com/bitnami
```

接着，使用 helm search repo 命令在已添加的仓库中搜索需要的 chart。例如，如果你想部署一个 Wordpress:

```bash
$ helm search repo wordpress
NAME                                        CHART VERSION   APP VERSION     DESCRIPTION
bitnami/wordpress                           15.3.1          6.2.1           Web publishing platform for building blogs and websites
bitnami/wordpress-multisite                 6.3.1           5.7.4           WordPress for Multisite environments
```

选择合适的 WordPress chart，使用helm install命令进行安装。

```bash
$ helm install my - wordpress - instance bitnami/wordpress 
```
当不再需要 WordPress 应用程序时，使用 helm uninstall my - wordpress - instance 命令卸载。这会删除 Kubernetes 集群中为 WordPress 创建的所有资源。