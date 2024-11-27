# 10.4.1 Tekton 中的资源对象

Tekton 利用 Kubernetes 资源扩展机制，定义了一系列与构建流水线相关的 CRD 资源：

- Task（任务）：描述任务的基本单元，每个 Task 由一系列“步骤”（Steps）构成，任务的“步骤”按串行方式执行。例如，一个程序的可用性测试任务包括克隆代码、编译和执行测试步骤。
- TaskRun：TaskRun 是 Task 的实际执行器。Task 本身仅定义了任务的内容，而 TaskRun 创建后会在 Kubernetes 集群中启动一个 Pod 来执行这些任务。
- Pipeline（流水线）：Pipeline 是一个或多个 Task 的组合。Pipeline 中的任务可以按顺序执行，也可以定义依赖关系，以实现复杂的工作流。
- PipelineRun：类似于 TaskRun，PipelineRun 是 Pipeline 的实际执行器。PipelineRun 对象提交到 Kubernetes 后，Tekton 会实例化并执行对应的 Pipeline。

当用户创建了各类 Task 和 Pipeline 后，Tekton 的 TriggerBinding 组件会在外部事件（如代码提交或 git merge）触发时解析事件参数（如 git 仓库地址），并将这些参数传递给 Pipeline。随后，Pipeline 会执行代码测试、镜像构建和镜像推送等任务。其流程如图 10-6 所示。

:::center
  ![](../assets/tekton-pipeline.png)<br/>
  图 10-6 使用 Tekton 进行持续集成的流程
:::



