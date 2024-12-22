# 10.4 使用 Tekton 进行持续集成

Tekton 是一个开源的 Kubernetes 原生持续集成/持续交付（CI/CD）工具，由 Google 发起。它的核心是通过自定义资源定义（CRD）在 Kubernetes 集群中实现流水线即代码（Pipeline as Code）。这意味着开发人员可以使用代码的方式来定义复杂的构建、测试和部署流水线。例如，一个软件开发团队可以利用 Tekton 来构建从代码拉取、单元测试、构建容器镜像，一直到将镜像部署到 Kubernetes 集群的“一条龙”流程。


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