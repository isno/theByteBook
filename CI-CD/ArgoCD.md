# ArgoCD

ArgoCD 是以 Kubernetes 作为基础设施，遵循声明式 GitOps 理念的持续交付工具，Argo CD 可在 Git 存储库更改时自动同步和部署应用程序。
它支持多种配置管理，包括 ksonnet/jsonnet、kustomize 和 Helm 等。它的配置和使用非常简单，并自带一个简单易用的可视化界面。

> ArgoCD 是 Intuit 公司开源出来的属于整个 Argo 项目中的其中一个子项目，整个 Argo 项目中还包括 Argo-event、argo-workflow、Argo-Rollout


## Argo CD主要优势有：

- 应用程序定义、配置和环境应该是声明性的和版本控制的。
- 应用程序部署和生命周期管理应该是自动化的、可审计的，并且容易理解。
- Argo CD是一个独立的部署工具，支持对多个环境、多个Kubernetes集群上的应用进行统一部署和管理。


## ArgoCD 工作流程

<div  align="center">
	<img src="../assets/ArgoCD.png" width = "400"  align=center />
</div>

Argo CD 是通过一个 Kubernetes 控制器来实现的，它持续 watch 正在运行的应用程序并将当前的实时状态与所需的目标状态( Git 存储库中指定的)进行比较。

已经部署的应用程序的实际状态与目标状态有差异，则被认为是 OutOfSync 状态，Argo CD 会报告显示这些差异，同时提供工具来自动或手动将状态同步到期望的目标状态。在 Git 仓库中对期望目标状态所做的任何修改都可以自动应用反馈到指定的目标环境中去。