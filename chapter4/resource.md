# 集群资源弹性伸缩

弹性伸缩主要目的是解决两个问题：突发流量情况下的服务稳定以及资源成本合理利用的问题。


典型的互联网服务有明显的流量高峰低谷情况，很多业务在早期资源规划上相对粗放，对应到资源利用率上面，在高峰阶段整个集群总体利用率甚至20%都达不到，更别说在低谷阶段了。

<div  align="center">
	<img src="/assets/chapter4/dau.png" width = "600"  align=center />
</div>

在这种情况下，如果我们能做到晚高峰资源自动扩容保障服务稳定。低谷集群规模自动收缩，省出来的资源用于做离线计算，或者其他非实时的任务，这对于大规模集群资源成本控制和收益非常大的改善。


## Kubernetes弹性伸缩

在Kubernetes中共有三种不同的弹性伸缩策略

- HPA：根据利用率，自动伸缩Pod数量
- VPA：Pod配置自动扩/缩
- CA：Node级别自动扩/缩容


### 使用HPA

HPA是用来控制Pod水平伸缩的K8S内置控制器，基于设定的扩容缩规则，实时采集监控指标数据，根据用户设定的指标阈值计算副本数，进而调整目标资源副本数量，完成扩缩容动作。

目前版本有：autoscaling/v1、autoscaling/v2beta1和autoscaling/v2beta2 三个大版本 。

autoscaling/v1只支持CPU一个指标的弹性伸缩

autoscaling/v2beta1支持自定义指标

autoscaling/v2beta2支持外部指标



下面通过示例演示HPA的使用。首先使用Nginx镜像创建一个4副本的Deployment。

```
$ kubectl get deploy

$ kubectl get pods
```

创建一个HPA，期望CPU的利用率为70%，副本数的范围是1-10。

```
apiVersion: autoscaling/v2beta1
kind: HorizontalPodAutoscaler
metadata:
  name: scale
  namespace: default
spec:
  maxReplicas: 10                    # 目标资源的最大副本数量
  minReplicas: 1                     # 目标资源的最小副本数量
  metrics:                           # 度量指标，期望CPU的利用率为70%
  - resource:
      name: cpu
      targetAverageUtilization: 70
    type: Resource
  scaleTargetRef:                    # 目标资源
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-deployment

```

创建后HPA查看。

```
$ kubectl create -f hpa.yaml

$ kubectl get hpa
```

可以看到，TARGETS的期望值是70%，而实际是0%，这就意味着HPA会做出缩容动作，期望副本数量=(0+0+0+0)/70=0，但是由于最小副本数为1，所以Pod数量会调整为1。

等待一段时间，可以看到Pod数量变为1。

```
kubectl get pods
```

查看HPA详情，可以在Events里面看到这样一条记录。这表示HPA在21秒前成功的执行了缩容动作，新的Pod数量为1，原因是所有度量数量都比目标值低。

```
kubectl describe hpa scale
...
  Normal  SuccessfulRescale  21s   horizontal-pod-autoscaler  New size: 1; reason: All metrics below target

```

### CA节点扩缩容

HPA是针对Pod级别的，但是如果集群的资源不够了，那就只能对节点进行扩容了。

Cluster AutoScaler 是一个自动扩展和收缩 Kubernetes 集群 Node 的扩展。当集群容量不足时，它会自动去 Cloud Provider （目前体大部分公有云都有支持）创建新的 Node，而在 Node 长时间资源利用率很低时自动将其删除以节省开支。

#### 基于阿里云的 CA 实践

CA 提供了Cloud Provider 接口供各个云厂商接入，主要是针对厂商自己的API，应对节点添加以及删除的请求。

目前云厂商的ECS产品都会有扩缩容的功能（例如阿里云ESS，就是CA中伸缩组的概念），CA就可以结合ESS完成集群的扩缩容功能。

关键yaml文件如下

```
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
  labels:
    app: cluster-autoscaler
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: admin
      containers:
        - image: registry.cn-hangzhou.aliyuncs.com/google-containers/cluster-autoscaler:v1.1.0
          name: cluster-autoscaler
          resources:
            limits:
              cpu: 100m
              memory: 300Mi
            requests:
              cpu: 100m
              memory: 300Mi
          command:
            - ./cluster-autoscaler
            - --v=4
            - --stderrthreshold=info
            - --cloud-provider=alicloud
            - --skip-nodes-with-local-storage=false
            - --nodes=1:100:${AUTO_SCALER_GROUP}
          env:
          - name: ACCESS_KEY_ID
            valueFrom:
              secretKeyRef:
                name: cloud-config
                key: access-key-id
          - name: ACCESS_KEY_SECRET
            valueFrom:
              secretKeyRef:
                name: cloud-config
                key: access-key-secret
          imagePullPolicy: "Always"
```

其中 `--nodes=1:100:${AUTO_SCALER_GROUP}`参数，表示扩容最大100个，缩容最小1个节点，后面`${AUTO_SCALER_GROUP}` 表示伸缩组ID(在阿里云创建 ESS 获取)

#### CA的扩容

CA会定期(默认10s,通过参数`--scan-interval`设置)检测当前集群状态下是否存在pending的pod，然后经过计算，判断需要扩容几个节点，最终从node group中进行节点的扩容：

Node Group 就对应伸缩组的概念，可以支持配置支持多个伸缩组，通过策略来进行选择，目前支持的策略为：

- random：随机选择
- most-pods：选择能够创建pod最多的Node Group
- least-waste：以最小浪费原则选择，即选择有最少可用资源的 Node Group
- price：根据主机的价格选择，选择最便宜的
- priority：根据优先级进行选择

#### CA的缩容

集群缩容其实是一个可选的选项，通过参数--scale-down-enabled控制是否开启缩容。

CA定期会检测集群状态，判断当前集群状态下，哪些节点资源利用率小于50%(通过参数--scale-down-utilization-threshold控制)。

资源利用率计算是通过判断集群cpu，mem 中request值占用率计算的，只要有一个指标超了就可能会出发缩容，之所以说是可能会触发扩容，是因为要保证被驱逐节点上的POD能够正确调度到其他节点上。

哪些NODE不会缩容：

- 当您设置了严格的 PodDisruptionBudget 的 Pod 不满足 PDB 时，不会缩容。
- Kube-system 下的 Pod。通过参数--skip-nodes-with-system-pods控制
- 节点上有非 deployment，replica set，job，stateful set 等控制器创建的 Pod。
- Pod 有本地存储。通过参数--skip-nodes-with-local-storage控制
- Pod 不能被调度到其他节点上。例如资源不满足等


#### 实现Cluster Provider

如果想要对接自己的IaaS层，只需要实现其中的接口就可以了，接口定义如下：



### 利用事件驱动 Keda 进行弹性伸缩

Kubernetes自带的HPA是只支持CPU/MEM等有限的指标，但事实情况这些指标不一定就能代表服务的负载情况，比如消息服务器，如果消息堆积过多，我们希望启用更多的 Customer处理消息，这种情况下就可以使用 Keda

<div  align="center">
	<img src="/assets/chapter4/keda.png" width = "450"  align=center />
</div>

KEDA 是 Kubernetes 基于事件驱动的自动伸缩工具，通过 KEDA 我们可以根据需要处理的事件数量来驱动 Kubernetes 中任何容器的扩展。

KEDA 可以直接部署到任何 Kubernetes 集群中和标准的组件一起工作。


Keda所支持的事件源非常丰富

<div  align="center">
	<img src="/assets/chapter4/keda.event-sources.png" width = "600"  align=center />
</div>

