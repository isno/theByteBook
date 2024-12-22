# 10.5 使用 Argo CD 进行持续交付

Argo CD 是一款用于 Kubernetes 的声明式持续交付工具，它被实现为一个Kubernetes 控制器，该控制器持续监控 Git 仓库的变更来实现自动拉取和更新机制。其背后工作原理如下：

- **定时轮询**: Argo CD Controller 定期轮询指定的 Git 仓库，检查是否有新的提交。默认情况下，轮询周期每 3 分钟一次。
- **Webhook 触发**: 为了更快地响应更新，Argo CD 支持通过 Git 仓库的 Webhook 来触发同步操作。当仓库中发生提交或合并请求时，GitLab、GitHub 等平台可以通过 Webhook 通知 Argo CD 立即进行同步。
- **状态对比**: 每次拉取到最新的 Git 仓库状态后，Argo CD 会与当前集群中的应用状态进行对比。如果发现差异，Argo CD 会自动执行同步操作，确保集群与 Git 仓库的配置一致。


:::center
  ![](../assets/argocd_architecture.png)<br/>
  图 10-10 Argo CD 如何工作 [图片来源](https://argo-cd.readthedocs.io/en/stable/)
:::

接下来，笔者将演示如何在集群中安装 Argo CD 并部署示例应用，简要介绍其使用方法。

## 10.5.1 安装 Argo CD

首先，创建一个专门用于 Argo CD 的命名空间“argocd”。然后通过 kubectl apply 安装 Argo CD 提供的 yaml 文件即可。

```bash
$ kubectl create namespace argocd
```
安装 Argo CD 有多种方法，这里选择使用 kubectl apply 命令应用官方 YAML 清单文件进行安装。下面的命令会在之前创建的 argocd 命名空间中安装 Argo CD 的所有必要组件，包括控制器、服务器、UI 等。

```bash
$ kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```
Argo CD 提供了一个用户友好的 Web 界面来管理应用。要访问 UI，首先需要获取初始密码。运行以下命令来获取密码：

```bash
$ kubectl -n argocd get secret argocd - initial - admin - secret - o jsonpath ="{.data.password}"| base64 -d
```
然后，使用以下命令设置端口转发来访问 UI。

```bash
$ kubectl port - forward svc/argocd - server -n argocd 8080:443
```

之后，你可以在浏览器中访问https://localhost:8080，并使用 admin 作为用户名和上面获取的密码进行登录。

## 10.5.2 部署应用

在 Argo CD 中，Application 是核心的自定义资源定义（CRD），它是 Argo CD 实现 GitOps 工作流的关键抽象，定义了应用的源代码位置、目标部署环境以及同步和监控策略。

以下是一个 Argo CD Application 资源的示例，展示如何从 Git 仓库部署一个 Kubernetes 应用到目标集群的特定命名空间：

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: example-app                 # 应用名称
  namespace: argocd                 # Argo CD 安装的命名空间
spec:
  project: default                  # Argo CD 项目名称（默认项目）
  source:
    repoURL: https://github.com/example/repo.git # 配置来源的 Git 仓库地址
    targetRevision: main            # Git 仓库分支或标签
    path: manifests                 # 仓库中存放 Kubernetes 配置的目录路径
  destination:
    server: https://kubernetes.default.svc # 目标集群 API Server 地址
    namespace: default              # 部署目标命名空间
  syncPolicy:
    automated:                      # 启用自动同步
      prune: true                   # 删除目标集群中不需要的资源
      selfHeal: true                # 自愈机制：检测到差异时自动修复
    syncOptions:
      - CreateNamespace=true        # 自动创建目标命名空间
```
将该 yaml 文件 apply 到 Kubernetes 集群。

```yaml
$ kubectl apply -f application.yaml
```

默认情况下，新创建的 Application 状态为 OutOfSync，Argo CD 尚未将 Git 仓库中的资源同步到目标集群。在 UI 控制台点击 “SYNC” 按钮触发同步操作，如果配置了 syncPolicy.automated Argo CD 会自动触发同步操作。

手动或自动触发同步后，状态会变为 Synced。

:::center
  ![](../assets/argocd-demo.png)<br/>
  图 10-11 Argo CD 应用部署示例
:::

此后，Argo CD 会根据 Application 的定义，持续跟踪应用在 Git 仓库中的期望状态和在 Kubernetes 集群中的实际状态，如果两者出现差异，它会尝试将实际状态同步到期望状态。例如，如果有人手动在集群中修改了某个应用资源的副本数量，Argo CD 会发现这种配置漂移，并根据 Application 的定义将副本数量恢复到 Git 仓库中配置的数量。

相比传统持续交付流程，Argo CD 下的应用程序的部署和生命周期管理明显变得更加**自动化**（通过自动同步、自动修复等），**可审计**（通过 Git 历史和审计日志），并且**易于理解**（通过可视化的 Web UI 和简化的部署流程）。