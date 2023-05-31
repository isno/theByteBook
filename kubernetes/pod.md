# Pod

笔者在前面介绍说，容器本质是个资源隔离的特殊进程，而对于 Pod ，则可以进一步理解为资源隔离一组特殊进程。

容器的设计哲学是希望在一个容器里面之运行一个进程，那么针对这个进程的辅助程序该如何设计呢，比如监控程序，再比如实现进程强耦合的Sidecar程序。如果按照容器的设计哲学进行思考，这就变得复杂起来。

Kubernetes 创新地将多个容器组合到一起，产生一个新的，也是Kubernetes最基本的管理资源单位 Pod。

每个 Pod 由一组容器构建，这些容器在集群同一个节点运行，共享相同的内部网络和存储等资源，他们之间相互协作，共同完成某一类特定的服务。这个设计思想最经典的体现在于 Service Mesh的实现，比如一个常规的服务，通过部署一个 Sidecar 代理容器，从来无缝地实现熔断限流、服务发现、负载均衡等功能。这种方式在监控、数据指标采集 Prometheus 等也大量采用，通过对每类对象开发相应的 export 完成数据指标的采集。

总而言之，就是通过 Pod 的设计方式，将一组紧密相关的进程共享网络、存储等资源，通过对 Pod 生命周期的管理，从而完成这一组容器的生命周期管理。


## 创建一个 Pod

```
apiVersion: v1                      # Kubernetes的API Version
kind: Pod                           # Kubernetes的资源类型
metadata:
  name: nginx                       # Pod的名称
spec:                               # Pod的具体规格（specification）
  containers:
  - image: nginx:alpine             # 使用的镜像为 nginx:alpine
    name: container-0               # 容器的名称
    resources:                      # 申请容器所需的资源
      limits:
        cpu: 100m
        memory: 200Mi
      requests:
        cpu: 100m
        memory: 200Mi
  imagePullSecrets:                 # 拉取镜像使用的证书，在CCE上必须为default-secret
  - name: default-secret
```

Pod创建完成后，可以使用kubectl get pods命令查询Pod的状态，如下所示。
```
$ kubectl get pods

NAME           READY   STATUS    RESTARTS   AGE
nginx          1/1     Running   0          40s
```

## Pod 生命周期

| 阶段| 说明|
|:-|:-|
|Pending| Pod 已经被 Kubernetes 接受（存在 etcd 中），等待 scheduler 调度 或者 调度成功拉取镜像|
| Running| Pod 中所有的容器都已创建，并且至少有一个容器正在运行|
| Succeeded | Pod 中所有的容器都被成功终止，并且不会重启，这个主要是执行 job 任务|
| Failed | Pod 中所有的容器都已经终止，并且至少有一个容器是非正常终止|
|Unknown| 无法获取 pod状态，通常是由于 Pod 节点通信出错，或者 kubelet 宕机所致|



## Pod 的网络

以 Calico 为例，Kubernetes会默认为每个pod分配一个IP地址，所有的Pod IP地址在同一个网段， kubeadm 在初始化时指定网段参数

```
kubeadm init --pod-network-cidr=192.168.2.0/24
```

Pod 中所有的容器会共享该 Pod 的IP地址，因此 Pod 内容器间通信，直接用 locahost+port 即可。