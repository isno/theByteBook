# 10.4.2 Tekton 的资源对象

实践之前，我们先了解 Tekton 定义的涉及构建 CI/CD 流水线相关的资源对象。

- **Task**：Tekton 编排流水线的最小单位，Task 内部可以定义 Steps 子步骤进行串行处理，子步骤如编译代码、构建和推送镜像。子步骤之间可以定义 inputs 和 outputs 进行参数传递。
- **TaskRun**：可以理解为一个 Task 对象的最终执行器。TaskRun 提交到 Kubernetes 之后，控制器会拉起一个 Pod，并在 Pod 内执行 Task。
- **Pipeline**：Tekton 中的流水线，由一个或多个 Task 组成，Task 之间使用 DAG（有向无环图）编排，Task 之间可以定义 inputs 和 outputs 进行参数传递。
- **PipelineRun**：可以理解为一个 Pipeline 对象的最终执行器。PipelineRun 对象提交到 Kubernetes 之后，Tekton 会具体实例化出一个 Pipeline 对象进行执行。

这些对象之间的关系如图 10-6 所示（右侧蓝色部分）。

:::center
  ![](../assets/tekton-pipeline.png)<br/>
  图 10-6 Tekton 构建流水线
:::



