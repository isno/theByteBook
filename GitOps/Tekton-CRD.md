# 10.4.2 Tekton 的资源对象

实践之前，我们先了解 Tekton 在 Kubernetes 中定义的几个涉及构建的 CRD 资源对象。

- **Task**：任务，由一个按顺序执行的 Step（步骤）组成，Step 是一些具体的动作，例如编译代码、构建镜像、推送镜像等。
- **TaskRun**：Task 只是描述了一个任务，而 TaskRun 则代表了一次 Task 实际的运行，TaskRun 创建出来之后，会自动触发 Task 描述的构建任务。
- **Pipeline**：流水线，由一个或多个 Task 组成，流水线定义了每个 Task 执行的顺序以及它们的依赖关系。
- **PipelineRun**：类似 Task 和 taskRun 的关系，PipelineRun 也表示某一次实际运行的 pipeline，提交一个 PipelineRun CRD 实例到 Kubernetes 后，同样也会触发一次 Pipeline 的构建。

这些对象之间的关系如图所示。

:::center
  ![](../assets/tekton-pipeline.png)<br/>
:::



