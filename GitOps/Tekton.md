# 10.4 使用 Tekton 进行持续集成

本文选择 Tekton 构建 CI 流程。

:::tip Tekton 是什么

Tekton 的前身是 Knative 项目的 build-pipeline 项目，这个项目是为了给 build 模块增加 pipeline 的功能，但是随着不同的功能加入到 Knative build 模块中，build 模块越来越变得像一个通用的 CI/CD 系统，于是，索性将 build-pipeline 剥离出 Knative，就变成了现在的 Tekton，而 Tekton 也从此致力于提供全功能、标准化的云原生 CI/CD 解决方案。

:::

构建 CI（持续集成）可选型的方案众多，例如 Gitlab CI、Jenkins、Travis CI、Circle CI 等，那为什么选择 Tekton 呢？

最主要的原因还是 Tekton 是一款基于 Kubernetes 实现的 CI/CD 框架，可以充分利用 Kubernetes 的生态与其他服务整合，例如监控、告警、日志等，形成基于 Kubernetes 的完整 DevOps 技术栈。

如下图所示，Tekton 简介：Cloud Native CI/CD（符合云原生理念的 CI/CD 系统）。

<div  align="center">
	<img src="../assets/Tekton.png" align=center />
</div>


Tekton 整体分为两部分：EventListener 和 Pipeline。

- **EventListener** ：用来监听 GitHub/GitLab 等系统的事件（push，pr 等），然后解析相关的参数（代码变更文件、提交人等），随后参数被传递到后面的 Pipeline 环节。
- **Pipeline**：是一个很形象的抽象，就如工厂的流水线一样（pipeline），原材料是源码，每一个工人处理一个步骤（task），可能是一个动作（one step，例如编译代码、构建镜像、推送镜像等），也可能是多个动作（multiple step），然后交付给下一个工人（task），最后产出产品（software）。

<div  align="center">
	<img src="../assets/tekton-pipeline.png" align=center />
</div>

