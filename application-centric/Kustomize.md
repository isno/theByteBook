# 10.3 Kustomize

最初 Kubernetes 对如何封装应用 的解决方案是用配置文件来配置文件，这并不是绕口令，可以理解为针对 yaml 模版引擎的变体。

Kubernetes 官方认为，应用就是一组具有相同目标的 Kubernetes 资源的集合，如果逐一管理、部署每项资源元数据过于繁琐的话，那就提供一种便捷的方式，把应用中不变的信息和易变的信息分离，应用中所涉及的资源自动生成一个多合一(All-in-One) 的整合包，以此解决部署管理问题。

完成这项工作的工具就叫 Kustomize。Kustomize 原本只是一个独立的小工具，从 Kubernetes 1.14 起，被纳入了 kubectl 命令中，成为 Kubernetes 内置的功能。

Kustomize 采用分层的方式来管理配置。用户可以定义多个层次的配置，从基础配置层开始，然后通过添加或修改特定层次的配置来生成最终的配置。这就像搭建积木一样，基础的积木块（基础配置）是通用的，然后根据不同的需求添加不同的积木块（特定环境或功能的配置）来构建最终的结构（定制化配置）。

```bash
my - application/
    ├── base/
    │   ├── deployment.yaml
    │   └── service.yaml
    ├── dev/
    │   ├── kustomization.yaml
    │   └── resources.yaml
    └── prod/
        ├── kustomization.yaml
        └── resources.yaml
```

Kustomize 使用 Kustomization 文件来组织与应用相关的所有资源，Kustomization 本身也是一个 yaml 编写的配置文件，里面定义了构成应用的全部资源，以及资源中根据情况被覆盖的变量。

Kustomize 的价值在于根据环境来生成不同的部署配置，只要建立多个 Kustomization 文件，开发人员就能基于基准派生的方式，对应用不同模式（开发、测试），不同的项目（客制）定制出不同的资源整合包。

