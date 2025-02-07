# 10.2 声明式管理的本质

Kubernetes 与其他基础设施的最大不同是，它是基于声明式管理的系统。很多人容易将“声明式风格的 API”和“声明式管理”混为一谈，这实际上是对声明式管理缺乏正确认识。想要真正理解声明式管理，首先需要弄清楚 Kubernetes 的控制器模式。

## 10.1.1 控制器模式

分析 Kubernetes 的工作原理可以发现，无论是 kube-scheduler 调度 Pod，还是 Deployment 管理 Pod 部署，亦或是 HPA 执行弹性伸缩，它们的整体设计都遵循“控制器模式”。

例如，用户定义一个 Deployment 资源，指定运行的容器镜像和副本数量。Deployment 控制器根据这些定义，在 Kubernetes 节点上创建相应的 Pod，并持续监控它们的运行状态。如果某个副本 Pod 异常退出，控制器会自动创建新的 Pod，确保系统的“实际状态”始终与用户定义的“预期状态”（如 8 个副本）保持一致。

:::center
  ![](../assets/deployment-controller.png)<br/>
  图 10-1 Kubernetes 的控制器模式
:::

总结控制器模式的核心是，用户通过 YAML 文件定义资源的“预期状态”，然后“控制器”监视资源的实际状态。当实际状态与预期状态不一致时，控制器会执行相应操作，确保两者一致。在 Kubernetes 中，这个过程被称为“调谐”（Reconcile），即不断执行“检查 -> 差异分析 -> 执行”的循环。

调谐过程的存在，确保了系统状态始终向预期终态收敛。这个逻辑很容易理解：系统在第一次提交描述时达到了期望状态，但这并不意味着一个小时后的情况也是如此。

所以说，声明式管理的核心在于“调谐”，而声明式风格的 API 仅仅是一种对外的交互方式。

## 10.1.2 基础设施即数据思想

“控制器模式”体系的理论基础，是一种叫做 IaD（Infrastructure as Data，基础设施即数据）的思想。

IaD 思想主张，基础设施的管理应该脱离特定的编程语言或配置方式，而采用纯粹、格式化、系统可读的数据，描述用户期望的系统状态。这种思想的优势在于，对基础设施的所有操作本质上等同于对数据的“增、删、改、查”。更重要的是，这些操作的实现方式与基础设施本身无关，不依赖于特定编程语言、协议或 SDK，只要生成符合格式要求的“数据”，便可以“随心所欲”地采用任何你偏好的方式管理基础设施。

IaD 思想在 Kubernetes 上的体现，就是执行任何操作，只需要提交一个 YAML 文件，然后对 YAML 文件增、删、查、改即可，而不是必须使用 Kubernetes SDK 或者 Restful API。这个 YAML 文件其实就对应了 IaD 中的 Data。从这个角度来看，Kubernetes 暴露出来的各种 API 对象，本质是一张张预先定义好 Schema 的“表”（table）（见表 10-1 ）。唯一跟传统数据库不太一样的是，Kubernetes 并不以持久化这些数据为目标，而是监控数据变化驱动“控制器”执行相应操作。

:::center
表 10-1 Kubernetes 是个“数据库”
:::

|关系型数据库|Kubernetes (as a database)|说明|
|:--|:--|:--|
|DATABASE|cluster|一套 K8s 集群就是一个 database |
|TABLE| Kind |每种资源类型对应一个表|
|COLUMN|property|表里面的列，有 string、boolean 等多种类型|
|rows|resources|表中的一个具体记录|

本质上，Kubernetes v1.7 版本引入的 CRD（自定义资源定义）功能，其实是赋予用户管理自定义“数据”、将特定业务需求抽象为 Kubernetes 原生对象的能力。

例如，可以通过 CRD 定义持续交付领域中的 Task（任务）和 Pipeline（流水线）。这意味着，用户完全可以在 Kubernetes 的基础上，利用其内置能力扩展出一套全新的 CI/CD 系统。
```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: example-task
spec:
  steps:
    - name: echo-hello
      image: alpine:3.14
      script: |
        #!/bin/sh
        echo "Hello, Tekton!"
```

借助 CRD，工程师可以突破 Kubernetes 内置资源的限制，根据需求创建自定义资源类型，如数据库、CI/CD 流程、消息队列或数字证书等。配合自定义控制器，特定的业务逻辑和基础设施能力可以无缝集成到 Kubernetes 中。

最终，云原生生态圈那些让人兴奋的技术，通过插件、接口、容器设计模式、Mesh 形式，以“声明式管理”为基础下沉至 Kubernetes 中，并通过声明式 API 暴露出来。虽然 Kubernetes 的复杂度不断增加，但声明式 API 的优势在于，它能确保在基础设施复杂度指数级增长的同时，用户交互界面的复杂度仅以线性方式增长。否则的话，Kubernetes 早就变成一个既难学又难用的系统了。


