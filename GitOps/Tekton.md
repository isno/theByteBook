# 10.4 使用 Tekton 进行持续集成

构建 CI（持续集成）可选型的方案众多，例如 Gitlab CI、Jenkins、Travis CI、Circle CI 等，本文选择 Tekton 构建 CI 流程。

:::tip Tekton 是什么

Tekton 的前身是 Knative 项目的 build-pipeline 项目，这个项目是为了给 build 模块增加 pipeline 的功能，但是随着不同的功能加入到 Knative build 模块中，build 模块越来越变得像一个通用的 CI/CD 系统，于是，索性将 build-pipeline 剥离出 Knative，就变成了现在的 Tekton，而 Tekton 也从此致力于提供全功能、标准化的云原生 CI/CD 解决方案。

:::

选择 Tekton 最主要的原因还是 Tekton 是一款基于 Kubernetes 实现的 CI/CD 框架，可以充分利用 Kubernetes 的生态与其他服务整合，例如监控、告警、日志等，形成基于 Kubernetes 的完整 DevOps 技术栈。

如下图所示，Tekton 简介：Cloud Native CI/CD（符合云原生理念的 CI/CD 系统）。

<div  align="center">
	<img src="../assets/Tekton.png" align=center />
</div>

- **Task**：表示执行命令的一系列步骤，task 里可以定义一系列的 steps，例如编译代码、构建镜像、推送镜像等，每个 step 实际由一个 Pod 执行
- **TaskRun**：task 只是定义了一个模版，taskRun 才真正代表了一次实际的运行，当然你也可以自己手动创建一个 taskRun，taskRun 创建出来之后，就会自动触发 task 描述的构建任务
- **Pipeline**：一组任务，表示一个或多个 task、PipelineResource 以及各种定义参数的集合
- **PipelineRun**：类似 task 和 taskRun 的关系，pipelineRun 也表示某一次实际运行的 pipeline，下发一个 pipelineRun CRD 实例到 Kubernetes 后，同样也会触发一次 pipeline 的构建
- **PipelineResource**：表示 pipeline 输入资源，比如 github 上的源码，或者 pipeline 输出资源，例如一个容器镜像或者构建生成的 jar 包等


如图所示，这些对象之间的关系。

<div  align="center">
	<img src="../assets/tekton-pipeline.png" align=center />
</div>

每个任务都在自己的 Kubernetes Pod 中执行，因此，默认情况下，管道内的任务不共享数据。要在 Tasks 之间共享数据，你必须明确配置每个 Task 以使其输出可用于下一个 Task 并获取先前执行的 Task 的输出作为其输入。