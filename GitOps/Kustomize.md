# Kustomize

如果要在 Kubernets 发布一个应用， 并对外提供服务，需要配置诸如 Deployment、RC、PV、HPA、Service 等资源，并通过 Label 组合选择实现这些资源之间的松耦合。

如果想要这些资源之间的关系更加紧密，我们可以自己再向上抽象封装，通过另外一种配置将他们整合在一起。更重要的是，我们可以通过这层封装，屏蔽不同版本 API 之间差异，实现同一个配置兼容多版本集群，进而实现部署或迁移丝滑。


Kustomize 和 Helm 是 “无状态应用” 封装的典型代表。而 Operator 和 OAM 则是有状态应用的封装代表。

## Kustomize

最初 Kubernetes 对`如何封装应用` 的解决方案是`用配置文件来配置文件`，这并不是绕口令，可以理解为针对 yaml 模版引擎的变体。

Kubernetes 官方认为，应用就是一组具有相同目标的 Kubernetes 资源的集合，如果逐一管理、部署每项资源元数据过于繁琐的话，那就提供一种便捷的方式，把应用中不变的信息和易变的信息分离，应用中所涉及的资源自动生成一个多合一(All-in-One) 的整合包，以此解决部署管理问题。

完成这项工作的工具就叫 Kustomize。Kustomize 原本只是一个独立的小工具，从 Kubernetes 1.14 起，被纳入了 kubectl 命令中，成为 Kubernetes 内置的功能。

Kustomize 使用 Kustomization 文件来组织与应用相关的所有资源，Kustomization 本身也是一个 yaml 编写的配置文件，里面定义了构成应用的全部资源，以及资源中根据情况被覆盖的变量。

Kustomize 的价值在于根据环境来生成不同的部署配置，只要建立多个 Kustomization 文件，开发人员就能基于基准派生的方式，对应用不同模式（开发、测试），不同的项目（客制）定制出不同的资源整合包。


## Kustomize 示例

```plain
~/someApp
├── base
│   ├── deployment.yaml
│   ├── kustomization.yaml
│   └── service.yaml
└── overlays
    ├── development
    │   ├── cpu_count.yaml
    │   ├── kustomization.yaml
    │   └── replica_count.yaml
    └── production
        ├── cpu_count.yaml
        ├── kustomization.yaml
        └── replica_count.yaml
```
从上面的目录结构中，可以可以观察到一个由 Kustomize 管理的应用结构，它主要由 base 和 overlays 组成。

```plain
kustomize build ~/someApp/overlays/production
```

从效果上看，使用 Kustomize 编译生成的 All-in-One 整合包来部署应用相当方便，只要执行一行命令，就能够把应用所涉及的所有服务一次性安装好。


## 小结

Kustomize 毕竟只是一个`小工具`性质的辅助功能， 对于开发人员而言，使用 Kustomize 只能简化应用针对不同情况的重复配置，它其实并没有做到真正解决应用管理复杂的问题。

对于运维人员而言，应用的维护不仅仅只是部署，应用的整个生命周期除了部署还有更新、回滚、卸载、多版本、多实例、依赖维护等诸多工作。所以，要想解决这些问题，还需要更加强大的工具，这就是下面要介绍的 Helm。


