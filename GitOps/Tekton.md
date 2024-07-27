# 10.4 使用 Tekton 进行持续集成

Tekton 是由 Google 开源的，专为 Kubernetes 设计的持续集成和持续部署（CI/CD）系统。Tekton 是由 Knative 项目的 build-pipeline 组件孵化而成，目前交由 CDF（Continuous Delivery Foundation，持续交付基金会）进行维护。

Tekton 遵循云原生设计原则，使用声明式描述 CI/CD 中的流水线，并基于容器运行流水线。因此，相比 Gitlab CI、Jenkins 这类传统的 CI/CD 系统，Tekton 更适合现代云原生应用的开发和部署。 

:::center
  ![](../assets/Tekton.png)<br/>
  图 10-5 Tekton 的 slogan：Cloud Native CI/CD
:::

接下来，我们先了解 Tekton 中与构建流水线相关的概念，以及流水线执行的原理。然后再基于 Tekton 构建一套，包含程序测试、镜像构建和镜像推送的持续集成系统。 