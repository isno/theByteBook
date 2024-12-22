# 10.1 声明式应用管理

在 Kubernetes 中，用户通过声明式 API 定义资源的“预期状态”，“控制器”（Controller）负责监视资源的实际状态，当资源的实际状态和“预期状态”不一致时，控制器对系统进行必要的更改，以确保两者一致，这个过程被称之为“调谐”（Reconcile）。


例如下图，用户定义了一个 Deployment 资源，指定运行的容器镜像、副本数量等信息。Deployment 控制器根据该定义在 Kubernetes 节点上创建相应的 Pod，并持续监控其状态。如果某个 Pod 异常退出，控制器会自动创建新的 Pod，确保系统的实际状态始终与用户定义的“预期状态”（例如 8 个副本）保持一致。

:::center
  ![](../assets/deployment-controller.png)<br/>
  图 7-1Kubernetes 的控制器模式
:::

Kubernetes 中有多种类型的控制器，例如 Deployment Controller、ReplicaSet Controller 和 StatefulSet Controller 等等，每个控制器有着不同工作原理和适用场景，但它们的基本原理都是相同的。

通过声明式描述文件，以驱动控制器执行调谐来逼近，正是声明式应用管理最直观的体现。