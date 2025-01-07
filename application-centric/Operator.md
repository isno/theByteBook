# 10.3.3 Operator

Operator 的概念由 CoreOS 于 2016 年提出，它并非具体的工具或系统，而是一种在 Kubernetes 中封装、部署和管理应用的方法，特别适用于需要特定领域知识的复杂有状态应用，如数据库、分布式缓存和消息队列等。

:::tip
无状态应用像家畜，按规模化方式管理，个体之间无实质差异，出现问题时可直接用其他个体替代。有状态应用则像宠物，每个个体都有特定角色和作用，彼此不可替代，还需精心照料。
:::

Kubernetes 使用 Deployment 编排无状态应用，假设所有 Pod 完全相同，没有顺序依赖，也无需关心运行在哪台宿主机上。相反的，有状态应用（Stateful Applications）每个实例都需要维护特定的状态：
- **拓扑状态**：应用的多个实例之间并非完全对等关系。例如，在“主从”（Master-Slave）架构中，主节点 A 必须先于从节点 B 启动。若 A 和 B 两个 Pod 被删除后重新创建，也需严格遵循这一启动顺序。此外，新创建的 Pod 必须保留与原 Pod 相同的网络标识，以确保现有访问者能够通过原有的访问方式连接到新的 Pod。
- **存储状态**：应用的多个实例分别绑定了独立的存储数据。对于这些实例而言，Pod A 无论是首次读取数据还是在被重新创建后再次读取，所获取的数据都必须保持一致。最典型的例子，就是一个数据库应用的多个存储实例，每个实例需要持久化数据到本地存储，如果实例迁移到了其他节点，服务就无法正常使用。

Kubernetes v1.9 版本引入 StatefulSet 的核心功能就是用某种方式记录这些状态，当有状态应用的 Pod 重建后，仍然满足上一次运行状态的需求。


管理有状态应用往往依赖特定的领域知识，以数据库为例，不同类型（如 MySQL 和 MongoDB）的扩容、缩容和备份方式各不相同。工程师管理的手段也各有不同，Shell 脚本、Ansible 自动化工具或者命令行手动操作。

容器化应用程序最困难的任务之一，就是设计有状态分布式组件的部署体系结构。




其次，有状态应用的管理远不止，安装、启动、停止那么简单。应用实例的自愈、故障转移、负载均衡、备份、监控等等一系列运维操作也需要配套支持。


如果使用 Operator，情况就简单得多。Etcd 的 Operator 提供了 EtcdCluster 自定义资源，在它的帮助下，仅用几十行代码，安装、启动、停止等基础的运维操作。但对于其他高级运维操作，例如升级、扩容、备份、恢复、监控和故障转移，如下面代码所示。

```yaml
apiVersion: operator.etcd.database.coreos.com/v1beta2
kind: EtcdCluster
metadata:
  name: my-etcd-cluster
  namespace: default
spec:
  size: 3
  version: "3.4.15"
  storage:
    volumeClaimTemplate:
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 8Gi
```



要扩容的话也很简单，只要更新数量（比如从 3 改到 5），再 apply 一下，它同样会监听这个自定义资源的变动，去做对应的更新。这样就相当于把以前需要运维人员去处理集群的一些工作全部都交付给 Operator 去完成了。

更高级的 Operator 可以处理其他一些特性，如响应负载的自动伸缩、备份和恢复、与 Prometheus 等度量系统的集成，甚至可以进行故障检测和自动调优。


Operator 的实现上，其实是 Kubernetes 声明式 API 基础上的一种“微创新”。它利用了 CRD 构建“高层抽象”，又通过 Kubernetes 原生的“控制器模式”，将复杂应用的运维逻辑代码化。这种设计带来的好处远不止操作简单，而是充分遵循 Kubernetes 基于资源和控制器的设计原则，又无需受限于内置资源的表达能力。只要开发者愿意编写代码，特定领域的经验都可以转换为代码，通过 Operator 继承。

Operator 的设计模式使开发者可以根据自身业务自由的定义服务模型和相应的控制逻辑，一经推出就在开源社区引起了巨大的反响。主流的分布式应用纷纷推出了对应的 Operator 开源项目，RedHat 公司收购 CoreOS 之后也持续投入，推出了简化开发者编写 Operator 的 Operator Framework，进一步降低应用开发对 Kubernetes 底层 API 知识的依赖。

2019 年，Red Hat、AWS、Google Cloud 和 Microsoft 联合推出了 OperatorHub.io，为开源社区中的大量 Operator 定义统一的质量标准，并提供一个集中式的公共仓库。用户可以在该平台上搜索与业务应用对应的 Operator，通过向导页完成安装。同时，开发者也可以基于 Operator Framework 开发自己的 Operator，并将其上传分享至仓库。

:::center
  ![](../assets/operatorhub.io.png)<br/>
 图 3-14 operatorhub.io
:::
