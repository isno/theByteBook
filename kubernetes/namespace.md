# Namespace

Kubernetes提供了Namespace来做资源组织和划分，使用多Namespace可以将包含很多组件的系统分成不同的组。Namespace也可以用来做多租户划分，这样多个团队可以共用一个集群，使用的资源用Namespace划分开。


Namespace 只能做到组织上划分，对运行的对象来说，它不能做到真正的隔离。举例来说，如果两个 Namespace 下的Pod知道对方的IP，而 Kubernetes 依赖的底层网络没有提供 Namespace 之间的网络隔离的话，那这两个 Pod 就可以互相访问。