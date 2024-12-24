# 10.5 Operator

Operator 的概念由 CoreOS 公司在 2016 年提出，它其实并不算一个工具或者系统，而是一种封装、部署、管理 Kubernetes 应用的一种方法，特别是那些需要特定领域知识复杂有状态应用，例如数据库、分布式缓存和消息队列等。

理解 Operator 所做的工作，需要先弄清楚“有状态服务”和“无状态服务”的含义。

无状态服务是一种不依赖于之前请求状态来处理新请求的服务。从一个请求到下一个请求，服务不会记住任何信息，每个请求都是独立的，就好像每次服务都是在全新的状态下开始处理一样。Deployment 只适合于编排“无状态应用”，它会假设一个应用的所有 Pod是完全一样的，互相之间也没有顺序依赖，也无所谓运行在哪台宿主机上。正因为每个 Pod 都一样，需要的时候水平扩/缩，增加和删除 Pod。

对于有状态服务，需要考虑的细节就多了。服务运行的实例需要在本地存储持久化数据，比如 MySQL 数据库，你现在运行在节点 A，那么他的数据就存储在节点 A 上面的，如果这个时候你把该服务迁移到节点 B 去的话，那么就没有之前的数据了。针对这类应用使用 Deployment 控制器无法实现正确调度。

Kubernetes v1.9 版本引入 StatefulSet，它把有状态应用需要保持的状态抽象分为两种情况：

- **拓扑状态**。这种情况意味着，应用的多个实例之间并非完全对等关系。例如，在“主从”（Master-Slave）架构中，主节点 A 必须先于从节点 B 启动。若 A 和 B 两个 Pod 被删除后重新创建，也需严格遵循这一启动顺序。此外，新创建的 Pod 必须保留与原 Pod 相同的网络标识，以确保现有访问者能够通过原有的访问方式连接到新的 Pod。
- **存储状态**。这种情况意味着，应用的多个实例分别绑定了独立的存储数据。对于这些实例而言，Pod A 无论是首次读取数据还是在被重新创建后再次读取，所获取的数据都必须保持一致。最典型的例子，就是一个数据库应用的多个存储实例。

所以说，StatefulSet 的核心功能就是用某种方式记录这些状态，当有状态应用的 Pod 重建后，仍然满足上一次运行状态的需求。

通过 StatefulSet，有状态应用实现了安装、启动、停止等基础的运维操作。对于其他高级运维操作，例如升级、扩容、备份、恢复、监控和故障转移，StatefulSet 并不能提供有效的帮助。其次，通过 StatefulSet，定义相当多的细节，比如我们要部署一套 etcd 集群，要设置节点通信端口、环境变量配置、持久化存储、网络策略、安全证书、健康检查等大量细节。

通过下面 etcd 的例子感受。

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: etcd
  namespace: default
spec:
  serviceName: "etcd"
  replicas: 3  # etcd 集群的副本数
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
          image: quay.io/coreos/etcd:v3.5.0  # 替换为适合版本的镜像
          env:
            - name: ETCD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name  # 使用 Pod 名作为 etcd 节点名
            - name: ETCD_DATA_DIR
              value: /etcd-data  # 数据存储目录
            - name: ETCD_INITIAL_CLUSTER
              value: "etcd-0=etcd-0.etcd.default.svc.cluster.local:2380,etcd-1=etcd-1.etcd.default.svc.cluster.local:2380,etcd-2=etcd-2.etcd.default.svc.cluster.local:2380"
            - name: ETCD_INITIAL_CLUSTER_STATE
              value: "new"  # 如果是新集群，设置为 'new'
            - name: ETCD_INITIAL_CLUSTER_TOKEN
              value: "etcd-cluster"
            - name: ETCD_LISTEN_PEER_URLS
              value: "http://0.0.0.0:2380"  # 节点间通信的地址
            - name: ETCD_LISTEN_CLIENT_URLS
              value: "http://0.0.0.0:2379"  # 客户端访问的地址
            - name: ETCD_ADVERTISE_CLIENT_URLS
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP  # 将 Pod 的 IP 地址作为客户端访问地址
            - name: ETCD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name  # 使用 Pod 名作为 etcd 节点名
          volumeMounts:
            - name: etcd-data
              mountPath: /etcd-data
  volumeClaimTemplates:
    - metadata:
        name: etcd-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 8Gi  # 每个 Pod 请求的持久化存储大小
---
apiVersion: v1
kind: Service
metadata:
  name: etcd
  namespace: default
spec:
  clusterIP: None  # 使用 None 保证 Pod 可以通过 DNS 名称直接访问
  ports:
    - port: 2379
      name: client
    - port: 2380
      name: peer
  selector:
    app: etcd
---
apiVersion: v1
kind: Service
metadata:
  name: etcd-client
  namespace: default
spec:
  ports:
    - port: 2379
      targetPort: 2379
  selector:
    app: etcd
```

如果使用 Operator，情况就简单得多。Etcd 的 Operator 提供了 EtcdCluster 自定义资源，在它的帮助下，仅用几十行代码就可以实现上面等同的功能，如下面代码所示。

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

Operator 本身在实现上，其实是在 Kubernetes 声明式 API 基础上的一种“微创新”。它利用了 CRD 构建“高层抽象”，又通过 Kubernetes 原生的“控制器模式”，完成了一个面向分布式应用终态的“调谐”过程。

带来的好处远不止使用简单。

就是把运维的经验沉淀为代码，实现运维的代码化、自动化、智能化。以往的高可用、扩展收缩，以及故障恢复等等运维操作，都通过 Operator 进行沉淀下来。

现在很多复杂分布式系统都有了官方或者第三方提供的 Operator，从数据库（如 MySQL、PostgreSQL、MongoDB）到消息队列（如 RabbitMQ、Kafka），再到监控系统（如 Prometheus）。

这些 Operator 提供了 Kubernetes 集群中各种服务和应用程序的生命周期管理，