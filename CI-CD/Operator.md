# Operator

与 Kustomize 和 Helm 不同的是 Operator 不应当被称为一种工具或者系统，它应该算是一种封装、部署和管理 Kubernetes 应用的方法，尤其是针对最复杂的有状态应用去封装运维能力的解决方案。

Operator 是通过 Kubernetes 自定义资源CRD（Custom Resource Definitions， CRD）把应用封装为另一种更高层次的资源，再把 Kubernetes 控制器模式从面向内置资源，扩展到面向所有自定义资源，以此完成复杂应用的管理。

站在 Kubernetes 的角度看，是否有状态的本质差异在于，有状态应用会对外部某些资源有绑定性的直接依赖，比如 Elasticsearch 在建立实例时，必须依赖特定的存储位置，重启应用时只有仍然指向同一个数据文件的实例，才能被认为是相同的实例。

为了管理好与应用密切相关的状态信息，Kubernetes 从 1.9 版本发布了 StatefulSet 以及对应的 StatefulSetController。



有了 Elasticsearch Operator 的自定义资源，就相当于 Kubernetes 已经学会如何操作 Elasticsearch