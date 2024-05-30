# 10.4 使用 Tekton 进行持续集成

:::tip Tekton 是什么

Tekton 的前身是 Knative 项目的 build-pipeline 项目，这个项目是为了给 build 模块增加 pipeline 的功能，但是随着不同的功能加入到 Knative build 模块中，build 模块越来越变得像一个通用的 CI/CD 系统，于是，索性将 build-pipeline 剥离出 Knative，就变成了现在的 Tekton。

:::

Tekton 基于 Kubernetes 定义了一系列的 CRD 组装 CI/CD 流水线，并利用 Pod 来执行流水线中的任务。这些设计让 Tekton 相比于传统的 CI 系统（例如 Gitlab CI、Jenkins 等）成为 Kubernetes 下最符合云原生理念的 CI/CD 解决方案。

<div  align="center">
	<img src="../assets/Tekton.png" align=center />
</div>

本节，我将通过安装 Tekton，定义一系列的 Task，并按顺序构建一个涉及应用程序测试、镜像构建、镜像推送的 CI 流水线。 