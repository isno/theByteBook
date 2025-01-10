# 10.3.1 Kustomize

Kubernetes 中，应用由多个类型的资源文件组成。一旦应用稍具规模，Kubernetes 资源的配置文件就会开始泛滥，尤其是当环境之间的差异很小时，例如开发、生产环境。直接通过 kubectl 管理应用，你会发现十分“蛋疼”。

Kubernetes 官方对此的观点是，如果逐一配置、部署各个资源文件过于繁琐，那就提供一种便捷的方式，将应用中不变的信息与易变的信息分离，并自动生成一个多合一（All-in-One）的整合包，从而解决 YAML 资源文件配置、部署的问题。完成这项工作的工具叫 Kustomize。Kustomize 原本只是一个独立的小工具，从 Kubernetes 1.14 起，被纳入了 kubectl 命令中，成为 Kubernetes 内置的功能。

一个由 kustomize 管理的应用结构，主要由 base 和 overlays 目录组成。其中，base 目录称基础配置层，里面包含原始的 Kubernetes YAML 文件，例如 deployment.yaml 和 service.yaml；overlays 目录称覆盖层，它用于对基础配置进行定制和扩展。在每个 overlays 目录内，都包含一个 kustomization.yaml 文件，它负责定义该层次上的自定义配置和补丁。

```bash
.
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── dev/
│   │   ├── kustomization.yaml
│   │   └── patch-deployment.yaml
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── patch-deployment.yaml
│   └── prod/
│       ├── kustomization.yaml
│       └── patch-deployment.yaml

```
只要建立好多个 Kustomization 文件，kustomize 就可以在一个基础配置之上，对应用不同模式（开发、测试）、不同的项目（客制）定制出一个不同的 All-in-One 的资源整合包，把应用涉及的所有资源一次部署好。

```bash
kubectl apply -f all-in-one.yaml
```

不过，Kustomize 的定位只是个简单的配置管理工具，帮助开发人员简化应用在不同场景下的重复配置。对于一个应用而言，它的管理远不止于部署，还包括更新、回滚、卸载、多版本管理、多实例支持以及依赖维护等等。要解决这些问题，还需要更高级的“工具”，这就是接下来要介绍的 Helm。