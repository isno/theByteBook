# 资源对象

Kubernetes 是基于 REST （Representational State Transfer，表现层状态转化） 设计的，REST 是网络应用中的一种设计原则，凡是符合 REST 原则的架构，就可以称之为 RESTful 架构。Kubernetes 就是 RESTful 架构。

因为 Kubernetes 遵循 REST 原则，每个 Resource 在 Kubernetes 中的位置用 REST 路径来表示，对于 Resource 的管理，Kubernetes 内部、外部之间交互都采用统一方式的接口， 称之为 REST API。

kubectl 等命令调用使用的就是 REST API。我们也可以直接按照规范访问这些 API，实现企业内部平台。例如 Pod 资源的 REST 路径为 /api/v/pods, 使用 REST 路径，再加上 HTTP POST、GET、DELETE、PUT 等就可以完成指定资源的管理工作。

查看 Kubernetes 支持的资源信息。
```plain
$ kubectl api-resources
NAME                              SHORTNAMES   APIVERSION            NAMESPACED   KIND
bindings                                       v1                    true         Binding
componentstatuses                 cs           v1                    false        ComponentStatus
configmaps                        cm           v1                    true         ConfigMap
endpoints                         ep           v1                    true         Endpoints
events                            ev           v1                    true         Event
limitranges                       limits       v1                    true         LimitRange
...
```

以上即为 整个 Kubernetes 的 API，和一页又一页的 API 接口函数比较，实在简洁太多。 这就是基于 REST 风格来设计架构所带来的好处。


## Kubernetes 常用的资源

|类型|对象|
|:--|:--|
|资源资源| Pod、RS、Deployment、StatefulSet、DaemonSet、Job、CronJob、Node、Namespace、Service、Ingress、Label|
|存储资源| Volume、PersistentVolume、Secret、ConfigMap|
|策略资源| SecurityContext、RsourceQuota、LimitRange|
|身份资源|  ServiveAccount、Role、ClusterRole |

<div  align="center">
	<img src="../assets/k8s-runtime.png" width = "600"  align=center />
</div>


## API object

RESTful 架构下，Kubernetes 中所有内容都被抽象为“资源”，如 Pod、Service、Node 等都是资源，对象则资源的实例，是持久化的实体。在 “REST API” 的调用过程中会用 API Object 来表示 resource。

查看 resource 具体的结构信息

```plain
$ kubectl explain pod
KIND:     Pod
VERSION:  v1

DESCRIPTION:
     Pod is a collection of containers that can run on a host. This resource is
     created by clients and scheduled onto hosts.

FIELDS:
   apiVersion	<string>
     APIVersion defines the versioned schema of this representation of an
     object. Servers should convert recognized schemas to the latest internal
     value, and may reject unrecognized values. More info:
     https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources

   kind	<string>
...
```



当然 Kubernetes 并不支持维持对象存在这么简单，还管理者对象的方方面面，每个 Kubernetes 对象包含两个嵌套的对象字段，他们负责管理对象的配置，他们分别是 "spec", "status".
