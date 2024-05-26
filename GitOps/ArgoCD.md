# 10.5 使用 ArgoCD 进行持续交付

:::tip 什么是 ArgoCD

Argo CD 是以 Kubernetes 作为基础设施，遵循声明式 GitOps 理念的持续交付工具，Argo CD 支持多种配置管理，包括 ksonnet/jsonnet、kustomize 和 Helm 等。它的配置和使用非常简单，并自带一个简单易用的可视化界面。

:::

按照官方定义，Argo CD 被实现为一个 Kubernetes 控制器，它会持续监控正在运行的应用，并将当前的实际状态与 Git 仓库中声明的期望状态进行比较。无论是通过 CI 流水线触发更新 Kubernetes 编排文件，还是工程师直接修改 Kubernetes 编排文件，ArgoCD 都会自动拉取最新的配置并应用到 Kubernetes 集群中。

<div  align="center">
	<img src="../assets/ArgoCD-1.webp" width = "500"  align=center />
	<p>ArgoCD 如何工作</p>
</div>

接下来，笔者通过在集群内安装 ArgoCD 以及部署一个应用示例，以便读者了解其使用概况。

## 安装 ArgoCD

```
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Argo CD 服务不对外暴露服务，可以通过 LoadBalancer 或者 NodePort 类型的 Service、Ingress、Kubectl 端口转发等方式将 Argo CD 服务发布到 Kubernetes 集群外部。

通过 NodePort 服务的方式暴露 Argo CD 到集群外部

```
$ kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'
```

查找到 argocd-server 关联的 NodePort 端口，通过浏览器打开：https://localhost:35123/，这时候会出现登录界面。

argoCD 默认账户是 admin，帐号的初始密码是自动生成，并以明文的形式存储在 Argo CD 安装的命名空间中 argocd-initial-admin-secret 的 Secret 对象下的 password。

```
$ kubectl -n argocd get secret \
argocd-initial-admin-secret \
-o jsonpath="{.data.password}" | base64 -d
```

## 部署应用

通过 ArgoCD 部署，要创建 Application 类型的资源，它的职责就是将目标 Kubernetes 集群中的 namespace 与 Git 仓库中声明的期望状态连接起来，应用主要有两类信息：

- 来源（Source）信息：指的是 Git 仓库中 Kubernetes 资源配置清单所在的位置，可以是原生的 Kubernetes 配置清单，也可以是 Helm Chart 或者 Kustomize 部署清单
- 目标（Destination）信息：指定了 Kubernetes 集群中 API Server 的 URL 和相关的 namespace，这样 ArgoCD 就知道将应用部署到 Kubernetes 集群中的哪个位置。

如果是通过 argoCD Cli 创建，Application 的配置清单示例：

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

创建应用之后，因此还需要点击“SYNC” 按钮进行同步，并部署 Kubernetes 程序。应用程序同步之后如下图所示。

<div  align="center">
  <img src="../assets/argocd-demo.png"  align=center />
  <p>ArgoCD 应用部署示例</p>
</div>

Argo CD 中的项目（Project）可以用来对 Application 进行分组，不同的团队使用不同的项目，这样就实现了多租户环境。项目还支持更细粒度的访问权限控制：

