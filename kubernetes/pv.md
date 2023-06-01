# Pod 容器持久化存储

容器服务通常被设计成无状态的，每个容器都可以随意启停，并被可被编排到不同节点，但传统的应用都是携带数据状态，并且还有一些容器需要共享数据，此时就需要容器挂载外部存储。

Kubernetes 提供了 PV（PersistentVolume，PV）和 PVC（PersistentVolumeClaim， PVC）实现数据持久化的存储。启用 PV 用来表示具体的存储，它可以是一个 NFS 网络存储，也可以是一个本地存储路径，也可以是一个 ceph、gluster 类型的分布式文件系统， PVC 则表示用户的存储需求，存储空间最小最大值，访问方式、以及 Selector 对 PV 的匹配条件等。

在创建 PVC 时，Kubernetes 会根据 PVC 的筛选条件匹配合适的 PV 绑定。在Pod 中并不直接使用 PV，而是使用 PVC 实现 Pod和具体存储之间的对接， PVC 解除了 Pod 同具体存储之间的耦合，因此使得 Pod 使用 存储非常灵活。