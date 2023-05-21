# Service

容器的地址并不是固定的，为了以一种固定的方式访问Pod，Kubernetes 提供了一种负载均衡和服务发现的机制： Service。

Service 是 Kubernetes 提供的一种负载均衡器，Service 创建后会提供一个固定的虚拟IP(以 ClusterIP 类型的 Service 为例)，这个虚拟IP 通过iptables 或者 ipvs 实现，并不直接绑定到某个网卡，所以无法ping。 虚拟IP 在结合 coreDNS 实现服务发现。coreDNS提供格式如 `<service-name>.<namespace-name>.svs.cluster.local` 的服务，集群内的域名解析解析服务器会返回该服务所对应的 A记录。

这样，用户无需关心 Pod 在哪个节点上， 通过集群内部的域名解析即可实现对 Pod 的访问。

一个 Service 对应一组Pod服务, 每个Pod服务由该Pod 的IP+端口号标识, Kubernetes 把这个标签成为一个 Endpoint(端点)，Endpoint 是 Service的具体提供者，一组 Endpoint 称之为 Endpoints。 Endpoints 也是  Kubernetes 中的资源。

用户访问 Service，最终由该 Service 所对应的 Endpoints 中某个 Endpoint 来提供服务。Kubernetes 创建 Service 时，会根据配置中的 Selector 自动来创建 Endpoints。