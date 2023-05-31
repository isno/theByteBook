# Kube-proxy

Kube-proxy 是 kubernetes 工作节点上的一个网络代理组件，运行在每个 Node 节点上。Kube-proxy 维护节点上的网络规则，使发往 Service 的流量（通过 ClusterIP 和端口）负载均衡到正确的后端 Pod。