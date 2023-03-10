# 配置LoadBalancer

目前市面上开源的K8S-LoadBalancer主要就是MetalLB、OpenELB和PureLB这三种。我们在这里选取PureLB。

PureLB的组件高度模块化，并且可以自由选择实现ECMP模式的路由协议和软件，能更好的和我们前面的calico BGP模式组合在一起，借助calico自带的BGP配置把LoadBalancer IP发布到集群外。


## 配置 PureLB

因为我们此前已经配置了calico的BGP模式，并且会由它来负责BGP宣告的相关操作，因此在这里我们直接使用purelb的BGP模式，并且不需要自己再额外部署bird或frr来进行BGP路由发布，同时也不需要LBnodeagent组件来帮助暴露并吸引流量，只需要Allocator帮助我们完成LoadBalancerIP的分配操作即可。

```
# 下载官方提供的yaml文件到本地进行部署
$ wget https://gitlab.com/api/v4/projects/purelb%2Fpurelb/packages/generic/manifest/0.0.1/purelb-complete.yaml

# 请注意，由于 Kubernetes 的最终一致性架构，此manifest清单的第一个应用程序可能会失败。发生这种情况是因为清单既定义了CRD，又使用该CRD创建了资源。如果发生这种情况，请再次应用manifest清单，应该就会部署成功。
$ kubectl apply -f purelb-complete.yaml
$ kubectl apply -f purelb-complete.yaml

# lbnodeagent的这个ds我们这里用不到，因此可以直接删除。
$ kubectl delete ds -n purelb lbnodeagent

# 接下来我们部署一个ipam的sg，命名为bgp-ippool，ip段就使用我们预留的 10.33.192.0/18 
$ cat purelb-ipam.yaml
apiVersion: purelb.io/v1
kind: ServiceGroup
metadata:
  name: bgp-ippool
  namespace: purelb
spec:
  local:
    v4pool:
      subnet: '10.33.192.0/18'
      pool: '10.33.192.0-10.33.255.254'
      aggregation: /32
$ kubectl apply -f purelb-ipam.yaml
$ kubectl get sg -n purelb
NAME         AGE
bgp-ippool   64s
```