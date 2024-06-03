# 10.4.2 Tekton 的资源对象

Tekton 为 Kubernetes 提供多种 CRD 资源对象构建流水线，在实践之前我们先了解其中两个核心对象。

- **Task**：任务，由一个按顺序执行的 Step（步骤）组成，Task 中的 Step 例如编译代码、构建镜像、推送镜像等。
- **TaskRun**：Task 只是描述了一个任务，而 TaskRun 则代表了一次 Task 实际的运行，taskRun 创建出来之后，就会自动触发 task 描述的构建任务。
- **Pipeline**：流水线，由一个或多个 task 组成，流水线定义了每个 Task 执行的顺序以及它们的依赖关系。
- **PipelineRun**：类似 task 和 taskRun 的关系，pipelineRun 也表示某一次实际运行的 pipeline，下发一个 pipelineRun CRD 实例到 Kubernetes 后，同样也会触发一次 pipeline 的构建

由于 Task 在 Kubernetes Pod 中执行，默认情况下，Pipeline 内的 Task 不共享数据。要在 Tasks 之间共享数据，你必须明确配置每个 Task 以使其输出可用于下一个 Task 并获取先前执行的 Task 的输出作为其输入。

这些对象之间的关系如图所示。

:::center
  ![](../assets/tekton-pipeline.png)<br/>
:::



