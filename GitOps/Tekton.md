# 10.4 使用 Tekton 进行持续集成

Tekton 起源于 Google 主导的 Knative 项目，最初作为 Knative 的一个组件存在，名为 build-pipeline，用于在 Kubernetes 环境中构建容器化 CI/CD 流水线。随着功能的逐步扩展，build-pipeline 从 Knative 中独立出来，并更名为 Tekton，成为一个通用的、Kubernetes 原生的 CI/CD 框架。

Tekton 充分利用了 Kubernetes 的容器调度和管理能力，所有任务均在容器中（也就是 Pod）运行，并通过 YAML 文件定义流水线和任务。相比传统的 CI/CD 系统（如 GitLab CI 和 Jenkins），Tekton 更适合构建基于 Kubernetes 的 CI/CD 系统。

接下来，我们先了解 Tekton 中与构建流水线相关的概念以及流水线执行的原理。之后，再基于 Tekton 构建一个完整的持续集成系统，该系统包括程序测试、镜像构建和镜像推送。 