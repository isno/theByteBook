# 基础设施即代码

基础设施即代码（Infrastructure as Code, IaC），顾名思义，表示使用代码（而非手动流程）来定义基础设施，研发人员可以像对待应用软件一样对待基础设施，例如：
- 可以创建包含基础架构规范的声明式配置文件，从而便于编辑和分发配置。
- 可以确保每次配置的环境都完全相同。
- 可以进行版本控制，所有的变更都会被记录下来，方便溯源。
- 可以将基础设施划分为若干个模块化组件，并通过自动化以不同的方式进行组合。

广义上的 IaC 不仅仅只关于基础设施，还包含了网络、安全、配置等等，所以 IaC 又叫 X as Code。

<div  align="center">
	<img src="../assets/x-as-code.png" width = "450"  align=center />
</div>

## IaC 工具选型

GitOps 核心的关键就是要先找到合适的 IaC 工具。

将云商资源 IaC 化，比较典型的工具是 Terraform。Terraform 可以说是 IaC 概念最早期的奠基项目，生态最为完善，社区也非常活跃，背后也有非常成熟的商业上市公司 HashiCorp 进行支持。Terraform 抽象了 HCL 这门相对简单易学的 DSL 作为资源描述语言。

另外一个  Crossplane 。


### 应用层的 IaC

在云原生的大趋势下，很多公司选择了 Kubernetes 作为 PaaS 的基座，因此应用最终都是容器化运行于 Kubernetes 之上。

运行于 Kubernetes 之上的所有资源天然就已经被代码化了，其形式就是 YAML。YAML 是一种比较简单的配置语言，很适合用来描述声明式的资源对象。但也因为它的简单，局限性非常大。Kustomize 和 Helm 。

这两个工具本质上就是客户端 YAML 渲染引擎，用以更好的管理 YAML。从易用性的角度来看，Kustomize 更容易；而从功能性和生态来看，Helm 无疑是现在 Kubernetes 上的事实标准。但是，Helm 实在太难用了，有一定的学习门槛。Helm 的难用是由于其采用的渲染模版机制的难用。Helm 虽然没有提供任何 DSL，但是各种渲染模版的使用本质上就构成了一种 DSL，而且是一种相对不直观的 DSL。尽管如此，Helm 的功能性非常的完善，基本可以满足绝大多数的 YAML 生成需求。而且，Helm 还有相应的包管理机制 Helm Chart，几乎每一个流行的 Kubernetes 应用都会提供相应的 Helm Chart 供用户安装。