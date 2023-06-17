# Kustomize

Kunstomize 和 Helm 是 “无状态应用” 封装的典型代表。

最初 Kubernetes 对`如何封装应用` 的解决方案是`用配置文件来配置文件`，这并不是绕口令，可以理解为针对 yaml 模版引擎的变体。

Kubernetes 官方认为，应用就是一组具有相同目标的 Kubernetes 资源的集合，如果逐一管理、部署每项资源元数据过于繁琐的话，那就提供一种便捷的方式，把应用中不变的信息和易变的信息分离，应用中所涉及的资源自动生成一个多合一(All-in-One) 的整合包，以此解决部署管理问题。

完成这项工作的工具就叫 Kustomize。Kustomize 原本只是一个独立的小工具，从 Kubernetes 1.14起，被纳入了 kubctl 命令中，成为 Kubernetes 内置的功能。

Kustomize 使用 Kustomization 文件来组织与应用相关的所有资源，Kustomization 本身也是一个 yaml 编写的配置文件，里面定义了构成应用的全部资源，以及资源中根据情况被覆盖的变量。

Kustomize 的价值在于根据环境来生成不同的部署配置，只要建立多个 Kustomization 文件，开发人员就能基于基准派生的方式，对应用不同模式（开发、测试），不同的项目（客制）定制出不同的资源整合包。


## Kustomize 示例

从上面的目录结构中，可以可以观察到一个由 Kustomize 管理的应用结构，它主要由 base 和 overlays 组成。从效果上看，使用 Kustomize 编译生成的 All-in-One 整合包来部署应用相当方便，只要执行一行命令，就能够把应用所涉及的所有服务一次性安装好。

