# 10.5 使用 ArgoCD 进行持续交付

:::tip 什么是 ArgoCD

Argo CD 是以 Kubernetes 作为基础设施，遵循声明式 GitOps 理念的持续交付工具，Argo CD 支持多种配置管理，包括 ksonnet/jsonnet、kustomize 和 Helm 等。它的配置和使用非常简单，并自带一个简单易用的可视化界面。

:::

按照官方定义，Argo CD 被实现为一个 Kubernetes 控制器，它会持续监控正在运行的应用，并将当前的实际状态与 Git 仓库中声明的期望状态进行比较，如果实际状态不符合期望状态，就会更新应用的实际状态以匹配期望状态。

无论是通过 CI 流水线触发更新 Kubernetes 编排文件，还是工程师直接修改 Kubernetes 编排文件，ArgoCD 都会自动拉取最新的配置并应用到 Kubernetes 集群中。

<div  align="center">
	<img src="../assets/ArgoCD-1.webp" width = "500"  align=center />
	<p>ArgoCD 如何工作</p>
</div>


正式开始使用 ArgoCD 之前，我们先了解 ArgoCD 中的两个基本概念。

## Application

ArgoCD 中的 Application 定义了 Kubernetes 资源的来源（Source）和目标（Destination）。

- 来源指的是 Git 仓库中 Kubernetes 资源配置清单所在的位置，可以是原生的 Kubernetes 配置清单，也可以是 Helm Chart 或者 Kustomize 部署清单
- 目标是指资源在 Kubernetes 集群中的部署位置，指定了 Kubernetes 集群中 API Server 的 URL 和相关的 namespace，这样 ArgoCD 就知道将应用部署到哪个集群的哪个 namespace 中。

简而言之，Application 的职责就是将目标 Kubernetes 集群中的 namespace 与 Git 仓库中声明的期望状态连接起来。

Application 的配置清单示例：

```
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: guestbook
```

## ArgoCD Project

如果有多个团队，每个团队都要维护大量的应用，就需要用到 Argo CD 的另一个概念：项目（Project）。

Argo CD 中的项目（Project）可以用来对 Application 进行分组，不同的团队使用不同的项目，这样就实现了多租户环境。项目还支持更细粒度的访问权限控制：

- 限制部署内容（受信任的 Git 仓库）；
- 限制目标部署环境（目标集群和 namespace）；
- 限制部署的资源类型（例如 RBAC、CRD、DaemonSets、NetworkPolicy 等）；
- 定义项目角色，为 Application 提供 RBAC（与 OIDC group 或者 JWT 令牌绑定）


