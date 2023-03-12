# 部署 CNI插件 Calico

K8S CNI插件我们选用calico，calico官网主要给出了两种部署方式，分别是通过Calico operator和Calico manifests来进行部署和管理calico。

operator是通过deployment的方式部署一个calico的operator到集群中，再用其来管理calico的安装升级等生命周期操作。

manifests则是将相关都使用yaml的配置文件进行管理，这种方式管理起来相对前者比较麻烦，但是对于高度自定义的K8S集群有一定的优势。

这里我们使用operator的方式进行部署。

### 部署 Calico

把 Calico 部署文件下载到本地
```
curl https://raw.githubusercontent.com/projectcalico/calico/v3.24.5/manifests/tigera-operator.yaml -O
curl https://raw.githubusercontent.com/projectcalico/calico/v3.24.5/manifests/custom-resources.yaml -O
```

修改custom-resources.yaml里面的pod ip段信息和划分子网的大小

```
# cat custom-resources.yaml
# This section includes base Calico installation configuration.
# For more information, see: https://projectcalico.docs.tigera.io/master/reference/installation/api#operator.tigera.io/v1.Installation
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Configures Calico networking.
  calicoNetwork:
    # Note: The ipPools section cannot be modified post-install.
    ipPools:
    - blockSize: 24
      cidr: 10.33.0.0/17
      encapsulation: VXLANCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()

---

# This section configures the Calico API server.
# For more information, see: https://projectcalico.docs.tigera.io/master/reference/installation/api#operator.tigera.io/v1.APIServer
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec: {}
```

直接部署

```
kubectl create -f tigera-operator.yaml
kubectl create -f custom-resources.yaml
```

### calicoctl 安装

calicoctl 命令行工具 用于管理 Calico 策略和配置，以及查看详细的集群状态， 这里我们可以直接使用二进制部署安装。

```
curl -L https://github.com/projectcalico/calico/releases/download/v3.24.5/calicoctl-linux-amd64 -o /usr/local/bin/calicoctl
chmod +x /usr/local/bin/calicoctl
```

因为我们这里使用的是直接连接apiserver的方式，所以直接配置环境变量即可

```
export CALICO_DATASTORE_TYPE=kubernetes
export CALICO_KUBECONFIG=~/.kube/config
calicoctl get workloadendpoints -A
calicoctl node status
```

### 配置 BGP 

calico的BGP拓扑可以分为三种配置：Full-mesh（全网状连接）、Route reflectors（路由反射器）、Top of Rack (ToR)。

### Full-mesh（全网状连接）

启用 BGP 后，Calico 的默认行为是创建内部 BGP (iBGP) 连接的全网状连接，其中每个节点相互对等。这允许 Calico 在任何 L2 网络上运行，无论是公共云还是私有云，或者是配置了基于IPIP的overlays网络。

Calico 不将 BGP 用于 VXLAN overlays网络。全网状结构非常适合 100 个或更少节点的中小型部署，但在规模明显更大的情况下，全网状结构的效率会降低，calico建议使用路由反射器（Route reflectors）。

### Route reflectors（路由反射器）

要构建大型内部 BGP (iBGP) 集群，可以使用BGP 路由反射器来减少每个节点上使用的 BGP 对等体的数量。

在这个模型中，一些节点充当路由反射器，并被配置为在它们之间建立一个完整的网格。

然后将其他节点配置为与这些路由反射器的子集对等（通常为 2 个用于冗余），与全网状相比减少了 BGP 对等连接的总数。


### Top of Rack (ToR)

在本地部署中，我们可以直接让calico和物理网络基础设施建立BGP连接，一般来说这需要先把calico默认自带的Full-mesh配置禁用掉，然后将calico和本地的L3 ToR路由建立连接。当整个自建集群的规模很大的时候（通常仅当每个 L2 域中的节点数大于100时），还可以考虑在每个机架内使用BGP的路由反射器


由于我们是小规模的测试集群，暂时用不上路由反射器这类复杂的配置，因此我们参考第三种TOR的模式，让node直接和我们测试网络内的L3路由器建立BGP连接即可。


## 部署 calico ToR模式

calico是还没有创建BGPConfiguration，此时我们需要先手动创建，并且禁用nodeToNodeMesh配置，同时还需要借助calico将集群的ClusterIP和ExternalIP都发布出去。

```
$ cat calico-bgp-configuration.yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: false
  asNumber: 64517
  serviceClusterIPs:
  - cidr: 10.33.128.0/18
  serviceExternalIPs:
  - cidr: 10.33.192.0/18
  listenPort: 179
  bindMode: NodeIP
  communities:
  - name: bgp-large-community
    value: 64517:300:100
  prefixAdvertisements:
  - cidr: 10.33.0.0/17
    communities:
    - bgp-large-community
    - 64517:120

```

另一个就是需要准备BGPPeer的配置，可以同时配置一个或者多个，下面的示例配置了两个BGPPeer，并且ASN号各不相同。

其中keepOriginalNextHop默认是不配置的，这里特别配置为true，确保通过BGP宣发pod IP段路由的时候只宣发对应的node，而不是针对podIP也开启ECMP功能

```
$ cat calico-bgp-peer.yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: openwrt-peer
spec:
  peerIP: 10.31.254.253
  keepOriginalNextHop: true
  asNumber: 64512
---
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: tiny-unraid-peer
spec:
  peerIP: 10.31.100.100
  keepOriginalNextHop: true
  asNumber: 64516

```

配置完成之后我们直接部署即可，这时候集群默认的node-to-node-mesh就已经被我们禁用，此外还可以看到我们配置的两个BGPPeer已经顺利建立连接并发布路由了。

```
$ kubectl create -f calico-bgp-configuration.yaml
$ kubectl create -f calico-bgp-peer.yaml


$ calicoctl node status
Calico process is running.

IPv4 BGP status
+---------------+-----------+-------+----------+-------------+
| PEER ADDRESS  | PEER TYPE | STATE |  SINCE   |    INFO     |
+---------------+-----------+-------+----------+-------------+
| 10.31.254.253 | global    | up    | 08:03:49 | Established |
| 10.31.100.100 | global    | up    | 08:12:01 | Established |
+---------------+-----------+-------+----------+-------------+

IPv6 BGP status
No IPv6 peers found.
```