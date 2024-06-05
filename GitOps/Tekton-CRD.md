# 10.4.2 Tekton 的资源对象

实践之前，我们先了解 Tekton 定义的部分涉及 CI 构建的 CRD 资源对象。

- **Task**：由按顺序执行的 Step 组成，Step 包含具体操作，如编译代码、构建和推送镜像。
- **TaskRun**：Task 的实际运行实例，创建后会自动触发 Task 描述的任务。
- **Pipeline**：由一个或多个 Task 组成，定义 Task 的执行顺序和依赖关系。
- **PipelineRun**：Pipeline 的实际运行实例，提交后会触发 Pipeline 的构建。

这些对象之间的关系如图 10-6 所示（右侧蓝色部分）。

:::center
  ![](../assets/tekton-pipeline.png)<br/>
  图 10-6 Tekton 构建流水线
:::



