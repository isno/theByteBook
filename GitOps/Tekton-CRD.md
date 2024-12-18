# 10.4.1 Tekton 中的资源对象

Tekton 主要有以下几种关键的自定义资源定义（CRD）：

- **Task（任务）**：Task 是 Tekton 中最基本的构建块，它代表一个可以独立执行的工作单元。可以将其看作是一个脚本或者一系列命令的集合，用于完成诸如代码编译、测试等具体操作。
- **TaskRun**：TaskRun 用于触发和跟踪 Task 的一次具体执行。当你想要运行一个 Task 时，就需要创建一个 TaskRun 对象。它包含了 Task 执行的具体信息，如执行的参数等。
- **Pipeline（流水线）**：Pipeline 是多个 Task 按照特定顺序组合而成的工作流。它允许你定义复杂的 CI/CD 流程，将不同的操作（如构建、测试、部署等）串联起来。
- **PipelineRun**：PipelineRun 用于触发和跟踪 Pipeline 的一次具体执行，类似于 TaskRun 对于 Task 的作用。它包含了运行 Pipeline 所需的参数和配置信息。

Tekton 事件触发器（Trigger）监听外部事件（如 Webhook），会使用 TriggerBinding 解析事件数据，并传递给 TriggerTemplate，然后根据模板创建和启动一个 PipelineRun。
当发生特定事件（例如代码提交、标签发布等）时，会自动触发 Tekton 流水线的执行。TriggerBinding 则从 Webhook 的 payload 中提取相关信息，并将其转化为 Tekton 中的参数。
随后，Pipeline 会执行代码测试、镜像构建和镜像推送等任务。其流程如图 10-6 所示。

:::center
  ![](../assets/tekton-pipeline.png)<br/>
  图 10-6 使用 Tekton 进行持续集成的流程
:::



