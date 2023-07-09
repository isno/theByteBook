# API Server 高可用负载均衡

在 Kubernetes 集群中，apiserver 是整个集群的入口，任何用户或者程序对集群资源的增删改查操作都需要经过 kube-apiserver，因此它的高可用性决定了整个集群的高可用能力。

kube-apiserver 本质上是一个无状态的服务器，为了实现其高可用，通常会部署多个 kube-apiserver 实例，同时引入外部负载均衡器（以下简称 LB）进行流量代理。后续用户（ kubectl 、 dashbaord 等其他客户端）和集群内部的组件都将通过访问 LB 来访问 apiserver 。

