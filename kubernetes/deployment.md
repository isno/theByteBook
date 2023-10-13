# 8.4.2 Deployment 和 ReplicaSet

根据 Kubernetes 官方建议：用户应尽量避免直接创建 Pod 和 RS，而是应该使用 Deployment 来完成 Pod 和 RS 的创建和使用。

本文介绍一下 Deployment 和 RS 的运作方式。

在前面文章介绍了单个 Pod 的操作，但 Kubernetes 并不是直接将 Pod 暴露出去，而是通过副本集 （replication），将一组相同的 Pod 作为一个集合管理。

Kubernetes 通过标签为每个 Pod 打上一个或多个标签，副本集通过标签选择器管理 Pod，副本集最重要的属性就是副本数，用来定义这个副本集中 Pod 的数量。副本集最先叫 RC（Replication Controller）, 后来升级为 RS（ReplicaSet）。他们的主要区别在于 Selector （选择器），相较来说 RS 中的 Selector 更为强大和灵活，此外 RS 还可以用于 Pod 的水平自动伸缩 (HPA), 实现 Pod 规模因负载而自动调整。

但 RS 通常并不直接使用，而是通过  Deployment 就像定义管理，在 创建 Deployment 的时候，会自动创建 RS，在删除 Deployment 的时候，也会自动回收 RS。
这么做是为了支持滚动升级、回滚、扩缩容等操作。

例如，当我们操作 Deployment 升级版本的时候， Kubernetes 会先创建一个新的副本数为 0 的 RS，然后根据策略 （按照 25%的进度）减少旧的 RS 副本数，同时增加新的 RS 副本数，从而完成升级，包括扩缩容等其他操作，Kubernetes 都会自动维护 RS，不需要再进行干预。


一个 Deployment 的 yaml 定义如下：

```plain
apiVersion: apps/v1 # API 版本
kind: Deployment # 资源类型
metadata:
  name: nginx-deployment # deployment 名词
spec:
  replicas: 2 # 副本数
  selector: # 选择器
    matchLabels:
      app: nginx
  template: # Pod 模版
    metadata:
      labels: # Pod 标签
        app: nginx
    spec:
    	containers: # 容器列表
        - name: nginx
          image: nginx:1.7.9 # 容器镜像
          ports:
            - containerPort: 8888 # 容器端口
```

yaml 文件中设置了 Deployment 的名称（metadata.name）、副本数 (spec.replicas)、标签选择器 (spec.selector) 和 Pod 模版 (spec.template). 其中，标签选择器通过对对应的标签匹配 Pod 进行筛选。