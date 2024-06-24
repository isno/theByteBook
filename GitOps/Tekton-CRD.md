# 10.4.2 Tekton 的资源对象

实践之前，我们先了解 Tekton 定义的涉及构建 CI/CD 流水线相关的资源对象。

- **Task**：由按顺序执行的 Step 组成，Step 是指流水线中具体操作，如编译代码、构建和推送镜像。
- **TaskRun**：Task 的运行实例，创建后会自动触发关联的 Task ，执行 Task 描述的一系列 Step。
- **Pipeline**：由一个或多个 Task 组成，定义 Task 的执行顺序和依赖关系。
- **PipelineRun**：Pipeline 的运行实例，提交后会自动触发关联的 Pipeline 对象，执行流水线。

这些对象之间的关系如图 10-6 所示（右侧蓝色部分）。

:::center
  ![](../assets/tekton-pipeline.png)<br/>
  图 10-6 Tekton 构建流水线
:::



