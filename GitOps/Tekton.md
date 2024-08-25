# 10.4 使用 Tekton 进行持续集成

Tekton 是从 Knative 项目的 build-pipeline 组件发展而来的。Tekton 采用声明式的 YAML 文件来描述 CI/CD 流水线，流水线中的所有任务均基于容器运行。与传统的 CI/CD 系统如 GitLab CI 和 Jenkins 相比，Tekton 更适合构建以 Kubernetes 为底座的持续集成和持续部署（CI/CD）系统。



接下来，我们先了解 Tekton 中与构建流水线相关的概念以及流水线执行的原理。之后，再基于 Tekton 构建一个完整的持续集成系统，该系统包括程序测试、镜像构建和镜像推送。 