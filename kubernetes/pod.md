# 8.4.1 Pod

笔者在前面介绍说，容器本质是个资源隔离的特殊进程，而对于 Pod ，则可以理解是资源隔离一组特殊进程。Kubernetes 创新地将多个容器组合到一起，产生一个新的也是 Kubernetes 最基本的管理资源单位 Pod。

每个 Pod 由一组容器构建，Kubernetes 通过 Pod 的设计方式将一组紧密相关的进程共享网络、存储等资源，通过对 Pod 生命周期的管理，从而完成这一组容器的生命周期管理。

## 创建一个 Pod

```plain
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

Pod 创建完成后，可以使用 kubectl get pods 命令查询 Pod 的状态，如下所示。
```plain
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
|Unknown| 无法获取 pod 状态，通常是由于 Pod 节点通信出错，或者 kubelet 宕机所致|



## Pod 的网络

以 Calico 为例，Kubernetes 会默认为每个 pod 分配一个 IP 地址，所有的 Pod IP 地址在同一个网段， kubeadm 在初始化时指定网段参数

```plain
kubeadm init --pod-network-cidr=192.168.2.0/24
```

Pod 中所有的容器会共享该 Pod 的 IP 地址，因此 Pod 内容器间通信，直接用 locahost+port 即可。