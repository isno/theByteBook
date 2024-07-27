# 10.4.1 Tekton 中的资源对象

Tekton 充分利用了 Kubernetes 资源和扩展能力，定义了一系列构建流水线相关的 CRD 资源对象，核心资源对象如下：

- **Task（任务）**：Task 是 Tekton 中描述任务的最小单位，用于定义具体的任务。Task 由一系列 Steps（子步骤）串行处理。例如一个程序可用性测试任务，它由克隆代码仓库、程序编译、执行测试等子步骤组成。
- **TaskRun**：TaskRun 可以理解为一个 Task 对象的最终执行器。Task 只是用来描述任务，创建之后并不会执行，只有与它进行关联的 TaskRun 被创建之后，才会在 Kubernetes 集群中拉起一个 Pod 真正执行任务。
- **Pipeline（流水线）**：是一个或多个 Task 组合。Pipeline 中的任务可以按顺序执行，也可以定义依赖关系。
- **PipelineRun**：同 TaskRun 一样，PipelineRun 可以理解为 Pipeline 对象的最终执行器。PipelineRun 对象提交到 Kubernetes 之后，Tekton 会具体实例化出一个 Pipeline 对象进行执行。


当用户创建完各类 Task 和 Pipeline 之后，当如代码提交、git merge 等外部事件触发时，Tekton 中的 TriggerBinding 组件解析事件中的参数（如 git 仓库地址），传递给 Pipeline，然后执行代码测试、镜像构建、镜像推送等任务，其流程如图 10-6 所示。

:::center
  ![](../assets/tekton-pipeline.png)<br/>
  图 10-6 使用 Tekton 进行持续集成的流程
:::



