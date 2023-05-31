# Namespace

如果仅用Label 进行资源划分，每次查询之类的动作都带一堆 Label 非常不方便。为此 Kubernetes 提供了 Namespace 来做资源组织和划分，使用多 Namespace 可以将包含很多组件的系统分成不同的组。Namespace 也可以用来做多租户划分，这样多个团队可以共用一个集群，使用的资源用 Namespace 划分开。

通过命令查询当前的 namespace

```
$ kubectl get ns

NAME                 STATUS   AGE
default              Active   10d
kube-node-lease      Active   10d
kube-public          Active   10d
kube-system          Active   10d
local-path-storage   Active   10d
```
使用kubectl 不指定 namespace 时，默认为default Namespace。

## Namespace 网络隔离

Namespace 只能做到组织上划分，对运行的对象来说，它不能做到真正的隔离。举例来说，如果两个 Namespace 下的 Pod 知道对方的 IP，而 Kubernetes 依赖的底层网络没有提供 Namespace 之间的网络隔离的话，那这两个 Pod 就可以互相访问。

Kubernetes 提供了 NetworkPolicy，支持按 Namespace 级别的网络隔离，需要注意的是，使用 NetworkPolicy 需要特定的网络解决方案，如果不启用，即使配置了 NetworkPolicy 也无济于事，生产环境中可以 Calico 配合 NetworkPolicy 实现业务需要的安全组策略。