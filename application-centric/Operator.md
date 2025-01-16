# 10.3.3 Operator

Operator 的概念由 CoreOS 于 2016 年提出，它并非具体的工具或系统，而是一种在 Kubernetes 中封装、部署和管理应用的方法，尤其适合管理需要特定领域知识的“有状态应用”（Stateful Application）。

管理有状态应用往往依赖特定的领域知识，以数据库为例，不同类型（如 MySQL 和 MongoDB）的扩容、缩容和备份方式各不相同。工程师管理的手段也各有不同，Shell 脚本、Ansible 自动化工具或者命令行手动操作。


:::tip
无状态应用像家畜，按规模化方式管理，个体之间无实质差异，出现问题时可直接用其他个体替代。有状态应用则像宠物，每个个体都有特定角色和作用，彼此不可替代，还需精心照料。
:::

Kubernetes 使用 Deployment 编排无状态应用，假设所有 Pod 完全相同，没有顺序依赖，也无需关心运行在哪台宿主机上。相反的，有状态应用（Stateful Applications）每个实例都需要维护特定的状态：
- **拓扑状态**：应用的多个实例之间并非完全对等关系。例如，在“主从”（Master-Slave）架构中，主节点 A 必须先于从节点 B 启动。此外，若 Pod 被删除重新，必须保留与原 Pod 相同的网络标识，以确保访问者能够通过原有的访问方式连接到新的 Pod。
- **存储状态**：应用的多个实例分别绑定了独立的存储数据。对于实例 Pod 而言，无论是首次读取还是在被重新创建后再次读取，获取的数据都必须一致。典型的例子是一个数据库应用的多个存储实例，每个实例需要持久化数据到本地存储，如果实例迁移到了其他节点，服务就无法正常使用。

Kubernetes v1.9 版本引入 StatefulSet 的核心功能就是用某种方式记录这些状态，当有状态应用的 Pod 重建后，仍然满足上一次运行状态的需求。不过有状态应用的维护并不限于此：
- 以 StatefulSet 创建的 Etcd 集群为例，最多只能实现创建、删除集群等基本操作。对于集群扩容、健康检查、备份恢复等等高级运维操作，也需要配套支持。
- 其次，使用 StatefulSet 创建 etcd 集群，还必须配置大量的细节，明确网络标识符、存储配置、集群成员管理、健康检查方式，告诉 Kuberntes 如何处理 Etcd。

笔者举一个具体的例子供你体会，你是否有“在 YAML 文件里编程序”的感觉？

```yaml
apiVersion: v1
kind: Service
metadata:
  name: etcd-headless
  labels:
    app: etcd
spec:
  clusterIP: None  # 必须为 None，启用 headless 服务
  selector:
    app: etcd
  ports:
    - port: 2379  # Etcd 客户端端口
      name: client
    - port: 2380  # Etcd 集群通信端口
      name: peer
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: etcd
spec:
  serviceName: "etcd-headless"
  replicas: 3  # 设置 Etcd 集群节点的副本数
  selector:
    matchLabels:
      app: etcd
  template:
    metadata:
      labels:
        app: etcd
    spec:
      containers:
        - name: etcd
          image: quay.io/coreos/etcd:v3.5.0  # 可根据需要修改版本
          command:
            - /bin/sh
            - -ec
            - |
              /usr/local/bin/etcd --name $(POD_NAME) \
                --data-dir /etcd-data \
                --listen-peer-urls http://0.0.0.0:2380 \
                --listen-client-urls http://0.0.0.0:2379 \
                --advertise-client-urls http://$(POD_NAME).etcd-headless:2379 \
                --initial-advertise-peer-urls http://$(POD_NAME).etcd-headless:2380 \
                --initial-cluster $(POD_NAME)=http://$(POD_NAME).etcd-headless:2380 \
                --initial-cluster-token etcd-cluster-1 \
                --initial-cluster-state new \
                --cert-file=/etc/etcd/certs/server.crt \
                --key-file=/etc/etcd/certs/server.key \
                --trusted-ca-file=/etc/etcd/certs/ca.crt
          volumeMounts:
            - mountPath: /etcd-data
              name: etcd-data
            - mountPath: /etc/etcd/certs
              name: etcd-certs
              readOnly: true
  volumeClaimTemplates:
    - metadata:
        name: etcd-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 1Gi  # 为每个 Pod 分配 1Gi 存储
    - metadata:
        name: etcd-certs
      spec:
        accessModes: ["ReadOnlyMany"]
        resources:
          requests:
            storage: 1Gi
```

观察上面的例子，不难发现，用户很难、也不想关心运维以及 Kubernetes 底层的各种概念。用户其实只关心下面两个信息。
```
port: 2379
image: quay.io/coreos/etcd:v3.5.0
```
将这样的对象暴漏给最终用户是不是简洁很多了呢！这种设计“简化版”的 API 对象，就叫做“构建上层抽象”，“构建上层抽象”是简化应用管理的必要手段。

直接来看使用 Operator 后的情况，事情就变得简单多了。Etcd 的 Operator 提供了 EtcdCluster 自定义资源，在它的帮助下，仅用几十行代码，安装、启动、停止等基础的运维操作。
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
要扩容的话也很简单，只要更新节点数量（比如 size 从 3 改到 5），再 apply 一下，它同样会监听这个自定义资源的变动，去做对应的更新。更高级的 Operator 还可以自动升级、扩容、备份、恢复，甚至于 Prometheus 系统集成，自动检测故障、自动转移故障。

Operator 的实现上，其实是基于 CRD 构建“高层抽象”，通过 Kubernetes 的原生“控制器模式”将有状态应用的运维操作代码化。它与 StatefulSet 也并非竞争关系，你完全可以编写一个 Operator，在其控制循环里创建和管理 StatefulSet，而非直接管理 Pod。例如，业界知名的 Prometheus Operator 就是这么实现的。这种设计的优势，不仅在于简化操作，更在于它遵循 Kubernetes 基于资源和控制器的设计原则，同时不受限于内置资源的表达能力。只要开发者愿意编写代码，特定领域的经验都可以转化为可重用的 Operator 逻辑。

Red Hat 收购 CoreOS 之后，为开发者提供一套完整的工具集 Operator Framework 简化 Kubernetes Operator 的开发过程，但这依然不是一件轻松的工作。以 etcd 的 Operator 为例，尽管 etcd 本身算不上特别复杂的有状态应用，etcd Operator 的功能也相对基础，但其代码超过了9,000 行。这是因为，管理有状态应用本身就是非常复杂的事情，更何况在容器云平台上进行管理。

尽管业内对状态应用以容器形式部署存在激烈争议，但可以肯定的是，若希望有状态应用在 Kubernetes 上稳定运行，Operator 是当前最可行的方案！
