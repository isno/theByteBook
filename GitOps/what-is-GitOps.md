# 10.2 什么是 GitOps

Google 工程师，Kubernetes 创始人之一的 Kelsey Hightower 对于 GitOps 的解释。

:::tip  Kelsey Hightower 的解释

GitOps 是声明式基础设施层之上的一种版本化控制的 CI/CD。这样大家可以不用编写脚本就能进行应用交付了。 

GitOps: versioned CI/CD on top of declarative infrastructure. Stop scripting and start shipping

:::right
-- 来源 https://www.gitops.tech/
:::

再进一步解释 GitOps 三个核心理念：
- **一切皆代码**：因为 GitOps 要将一切（应用程序、基础设施）代码化，然后用 Git 进行版本控制。对于应用程序或者基础设施的变更也都是通过 Git 进行。因为围绕这个点就有了 IaC（基础设施即代码）、安全策略即代码（Security Policy as Code）等。
- **Git 为单一可信源**：GitOps 中，所有的变更都是从 Git 侧发起（例如 GitLab），这样就能够进行版本化控制，方便安全和审计。 
- **声明式系统为基座**：以声明式系统(包括基础设施和应用程序)为基座(典型如 Kubernetes)。


理解了 GitOps 的概念以及声明式、IaC 等关键属性，再来看 GitOps 下的 CI/CD 实践流程，如下图所示：

<div  align="center">
  <img src="../assets/gitops-workflow.webp" width = "550"  align=center />
</div>

- 首先，团队成员都可以 fork 仓库对配置进行更改，然后提交 Pull Request。
- 接下来运行 CI 流水线，进行校验配置文件、执行自动化测试、构建 OCI 镜像、推送到镜像仓库等。
- CI 流水线执行完成后，拥有合并代码权限的人会将 Pull Request 合并到主分支。
- 最后运行 CD 流水线，结合 CD 工具（例如 Argo CD）将变更自动应用到目标集群中。


流程中，Argo CD 首先会被部署在 Kubernetes 集群中，基于 Pull 的部署模式，周期性地拉取 Git 仓库中的配置清单，持续监控应用的实际状态，并将实际状态与期望状态进行比较、修正。这就保证了即使有人修改了集群中的应用状态，Argo CD 还是会将其恢复到之前的状态。

如此，确保了 Git 仓库编排文件作为集群状态的唯一真实来源，那么：

- **回滚更快速**：Argo CD 会定期拉取最新配置并应用到集群中，一旦最新的配置导致应用出现故障，我们则可以用过 Git History 将应用状态快速恢复到上一个可用状态。
- **集群灾备更简单**：例如某个可用区的 Kubernetes 集群整体出现故障，且短期内不可恢复，这个时候我们可以直接创建一个新集群，然后将 Argo CD 连接到 Git 仓库, 新的集群将自动同步仓库内所有应用的配置声明，期间完全不需要人工干预。
- **合规及安全**：使用 Git 实现访问控制（开发人员Pull Request、管理人员 merge Request） ，除了集群管理员和少数人员外，其他人不再直接访问 Kubernetes 集群。而且 Argo CD 已经部署在 Kubernetes 集群中，必须的访问权限已经配置妥当，这样就不要给集群外配置额外的证书、权限等，从而给 Kubernetes 集群提供更为安全的保证。
