# 10.4.2 Tekton 的资源对象

Tekton 为 Kubernetes 提供多种 CRD 资源对象，用于构建流水线，在实践之前我们先了解这些 CRD 的概念。

- **Task**：表示执行命令的一系列步骤，task 里可以定义一系列的 steps，例如编译代码、构建镜像、推送镜像等，每个 step 实际由一个 Pod 执行
- **TaskRun**：task 只是定义了一个模版，taskRun 才真正代表了一次实际的运行，当然你也可以自己手动创建一个 taskRun，taskRun 创建出来之后，就会自动触发 task 描述的构建任务
- **Pipeline**：一组任务，表示一个或多个 task、PipelineResource 以及各种定义参数的集合
- **PipelineRun**：类似 task 和 taskRun 的关系，pipelineRun 也表示某一次实际运行的 pipeline，下发一个 pipelineRun CRD 实例到 Kubernetes 后，同样也会触发一次 pipeline 的构建
- **PipelineResource**：表示 pipeline 输入资源，比如 github 上的源码，或者 pipeline 输出资源，例如一个容器镜像或者构建生成的 jar 包等

每个 Task 都在自己的 Kubernetes Pod 中执行。因此，默认情况下，Pipeline 内的 Task 不共享数据。要在 Tasks 之间共享数据，你必须明确配置每个 Task 以使其输出可用于下一个 Task 并获取先前执行的 Task 的输出作为其输入。

这些对象之间的关系如图所示。

<div  align="center">
	<img src="../assets/tekton-pipeline.png" align=center />
</div>

