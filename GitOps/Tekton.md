# 10.4 使用 Tekton 进行持续集成

:::tip Tekton 是什么

Tekton 的前身是 Knative 项目的 build-pipeline 项目，这个项目是为了给 build 模块增加 pipeline 的功能，但是随着不同的功能加入到 Knative build 模块中，build 模块越来越变得像一个通用的 CI/CD 系统，于是，索性将 build-pipeline 剥离出 Knative，就变成了现在的 Tekton。

:::

Tekton 基于 Kubernetes 定义了一系列自定义资源定义（CRD），用于灵活地在 Kubernetes 中创建、管理和运行 CI/CD 流水线。由于完全基于 Kubernetes 实现，Tekton 相比于传统的 CI 系统（如 Gitlab CI、Jenkins 等），更符合云原生理念，成为当下最具优势的 CI/CD 解决方案。

:::center
  ![](../assets/Tekton.png)<br/>
  图 10-5 Tekton 的 slogan：Cloud Native CI/CD
:::

本节，我们将通过定义 Task 来构建一个包含程序测试、镜像构建和镜像推送的 CI 流水线，从而深入了解 Tekton 的使用。 