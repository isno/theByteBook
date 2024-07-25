# 10.4 使用 Tekton 进行持续集成

Tekton 是由 Google 开源的，专为 Kubernetes 设计的云原生 CI/CD 系统。

Tekton 基于 Kubernetes 定义了一系列的 CRD 资源，用来描述 CI/CD 中的任务与流水线，且任务完全基于 Pod 运行。因此，相比 Gitlab CI、Jenkins 这类传统的 CI/CD 系统，Tekton 是最符合云原生设计理念的。 

:::center
  ![](../assets/Tekton.png)<br/>
  图 10-5 Tekton 的 slogan：Cloud Native CI/CD
:::

本节，我们将通过定义 Task 来构建一个包含程序测试、镜像构建和镜像推送的 CI 流水线，从而深入了解 Tekton 的使用。 