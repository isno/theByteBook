# 10.2 什么是 GitOps


那什么是 GitOps？

先来看看 Google 工程师，Kubernetes 创始人之一的 Kelsey Hightower 对于 GitOps 的解释。

:::tip  Kelsey Hightower 的解释

GitOps 是声明式基础设施层之上的一种版本化控制的 CI/CD。这样大家可以不用编写脚本就能进行应用交付了。 

GitOps: versioned CI/CD on top of declarative infrastructure. Stop scripting and start shipping

:::right
-- 来源 https://www.gitops.tech/
:::

GitOps = IaC + Git+ CI/CD，即基于 IaC（Infrastructure as Code，基础设施即代码）版本化 CI/CD，核心是使用 Git 仓库来管理基础设施和应用的配置，并且以 Git 仓库作为基础设置和应用的单一事实来源。


进一步解释 GitOps 三个核心理念：
- **一切皆代码**：因为 GitOps 要将一切（应用程序、基础设施）代码化，然后用 Git 进行版本控制。对于应用程序或者基础设施的变更也都是通过 Git 进行。因为围绕这个点就有了 IaC（基础设施即代码）、安全策略即代码（Security Policy as Code）等。
- **Git 为单一可信源**：GitOps 中，所有的变更都是从 Git 侧发起（例如 GitLab），这样就能够进行版本化控制，方便安全和审计。 
- **声明式系统为基座**：以声明式系统(包括基础设施和应用程序)为基座(典型如 Kubernetes)。


