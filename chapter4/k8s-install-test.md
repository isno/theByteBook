# 部署测试用例以及验证

集群部署完成之后我们在k8s集群中部署一个nginx测试一下是否能够正常工作。

首先我们创建一个名为nginx-quic的命名空间（namespace），然后在这个命名空间内创建一个名为nginx-quic-deployment的deployment用来部署pod，最后再创建一个service用来暴露服务，这里我们同时使用nodeport和LoadBalancer两种方式来暴露服务，并且其中一个LoadBalancer的服务还要指定LoadBalancerIP方便我们测试。

```
# cat ngx-system.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nginx-quic

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-quic-deployment
  namespace: nginx-quic
spec:
  selector:
    matchLabels:
      app: nginx-quic
  replicas: 4
  template:
    metadata:
      labels:
        app: nginx-quic
    spec:
      containers:
      - name: nginx-quic
        image: tinychen777/nginx-quic:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80

---

apiVersion: v1
kind: Service
metadata:
  name: nginx-headless-service
  namespace: nginx-quic
spec:
  selector:
    app: nginx-quic
  clusterIP: None


---

apiVersion: v1
kind: Service
metadata:
  name: nginx-quic-service
  namespace: nginx-quic
spec:
  externalTrafficPolicy: Cluster
  selector:
    app: nginx-quic
  ports:
  - protocol: TCP
    port: 8080 # match for service access port
    targetPort: 80 # match for pod access port
    nodePort: 30088 # match for external access port
  type: NodePort


---

apiVersion: v1
kind: Service
metadata:
  name: nginx-clusterip-service
  namespace: nginx-quic
spec:
  selector:
    app: nginx-quic
  ports:
  - protocol: TCP
    port: 8080 # match for service access port
    targetPort: 80 # match for pod access port
  type: ClusterIP

---

apiVersion: v1
kind: Service
metadata:
  annotations:
    purelb.io/service-group: bgp-ippool
  name: nginx-lb-service
  namespace: nginx-quic
spec:
  allocateLoadBalancerNodePorts: true
  externalTrafficPolicy: Cluster
  internalTrafficPolicy: Cluster
  selector:
    app: nginx-quic
  ports:
  - protocol: TCP
    port: 80 # match for service access port
    targetPort: 80 # match for pod access port
  type: LoadBalancer
  loadBalancerIP: 10.33.192.80


---

apiVersion: v1
kind: Service
metadata:
  annotations:
    purelb.io/service-group: bgp-ippool
  name: nginx-lb2-service
  namespace: nginx-quic
spec:
  allocateLoadBalancerNodePorts: true
  externalTrafficPolicy: Cluster
  internalTrafficPolicy: Cluster
  selector:
    app: nginx-quic
  ports:
  - protocol: TCP
    port: 80 # match for service access port
    targetPort: 80 # match for pod access port
  type: LoadBalancer
```


部署完成之后我们检查各项服务的状态

```
$ kubectl get svc -n nginx-quic -o wide
NAME                      TYPE           CLUSTER-IP      EXTERNAL-IP    PORT(S)          AGE     SELECTOR
nginx-clusterip-service   ClusterIP      10.33.141.36    <none>         8080/TCP         2d22h   app=nginx-quic
nginx-headless-service    ClusterIP      None            <none>         <none>           2d22h   app=nginx-quic
nginx-lb-service          LoadBalancer   10.33.151.137   10.33.192.80   80:30167/TCP     2d22h   app=nginx-quic
nginx-lb2-service         LoadBalancer   10.33.154.206   10.33.192.0    80:31868/TCP     2d22h   app=nginx-quic
nginx-quic-service        NodePort       10.33.150.169   <none>         8080:30088/TCP   2d22h   app=nginx-quic

$ kubectl get pods -n nginx-quic -o wide
NAME                                     READY   STATUS    RESTARTS   AGE     IP           NODE                                       NOMINATED NODE   READINESS GATES
nginx-quic-deployment-5d7d9559dd-2f4kx   1/1     Running   0          2d22h   10.33.26.2   k8s-calico-worker-10-31-90-4.tinychen.io   <none>           <none>
nginx-quic-deployment-5d7d9559dd-8gm7s   1/1     Running   0          2d22h   10.33.93.3   k8s-calico-worker-10-31-90-6.tinychen.io   <none>           <none>
nginx-quic-deployment-5d7d9559dd-jwhth   1/1     Running   0          2d22h   10.33.93.2   k8s-calico-worker-10-31-90-6.tinychen.io   <none>           <none>
nginx-quic-deployment-5d7d9559dd-qxhqh   1/1     Running   0          2d22h   10.33.12.2   k8s-calico-worker-10-31-90-5.tinychen.io   <none>           <none>
```

随后我们分别在集群内外的机器进行测试，分别访问podIP 、clusterIP和loadbalancerIP。

```
# 查看是否能够正确返回集群外的客户端的IP地址10.31.100.100
# 在集群外访问pod IP
root@tiny-unraid:~# curl 10.33.26.2
10.31.100.100:43240
# 在集群外访问clusterIP
root@tiny-unraid:~# curl 10.33.151.137
10.31.90.5:52758
# 在集群外访问loadbalancerIP
root@tiny-unraid:~# curl 10.33.192.0
10.31.90.5:7319
# 在集群外访问loadbalancerIP
root@tiny-unraid:~# curl 10.33.192.80
10.31.90.5:38170

# 查看是否能够正确返回集群内的node的IP地址10.31.90.1
# 在集群内的node进行测试
[root@k8s-calico-master-10-31-90-1 ~]# curl 10.33.26.2
10.31.90.1:40222
[root@k8s-calico-master-10-31-90-1 ~]# curl 10.33.151.137
10.31.90.1:50773
[root@k8s-calico-master-10-31-90-1 ~]# curl 10.33.192.0
10.31.90.1:19219
[root@k8s-calico-master-10-31-90-1 ~]# curl 10.33.192.80
10.31.90.1:22346

# 查看是否能够正确返回集群内的pod的IP地址10.33.93.3
# 在集群内的pod进行测试
[root@nginx-quic-deployment-5d7d9559dd-8gm7s /]# curl 10.33.26.2
10.33.93.3:39560
[root@nginx-quic-deployment-5d7d9559dd-8gm7s /]# curl 10.33.151.137
10.33.93.3:58160
[root@nginx-quic-deployment-5d7d9559dd-8gm7s /]# curl 10.33.192.0
10.31.90.6:34183
[root@nginx-quic-deployment-5d7d9559dd-8gm7s /]# curl 10.33.192.80
10.31.90.6:64266
```

最后检测一下路由器端的情况，可以看到对应的podIP、clusterIP和loadbalancerIP段路由


```
B>* 10.33.5.0/24 [20/0] via 10.31.90.1, eth0, weight 1, 2d19h22m
B>* 10.33.12.0/24 [20/0] via 10.31.90.5, eth0, weight 1, 2d19h22m
B>* 10.33.23.0/24 [20/0] via 10.31.90.2, eth0, weight 1, 2d19h22m
B>* 10.33.26.0/24 [20/0] via 10.31.90.4, eth0, weight 1, 2d19h22m
B>* 10.33.57.0/24 [20/0] via 10.31.90.3, eth0, weight 1, 2d19h22m
B>* 10.33.93.0/24 [20/0] via 10.31.90.6, eth0, weight 1, 2d19h22m
B>* 10.33.128.0/18 [20/0] via 10.31.90.1, eth0, weight 1, 00:00:20
  *                       via 10.31.90.2, eth0, weight 1, 00:00:20
  *                       via 10.31.90.3, eth0, weight 1, 00:00:20
  *                       via 10.31.90.4, eth0, weight 1, 00:00:20
  *                       via 10.31.90.5, eth0, weight 1, 00:00:20
  *                       via 10.31.90.6, eth0, weight 1, 00:00:20
B>* 10.33.192.0/18 [20/0] via 10.31.90.1, eth0, weight 1, 2d19h21m
  *                       via 10.31.90.2, eth0, weight 1, 2d19h21m
  *                       via 10.31.90.3, eth0, weight 1, 2d19h21m
  *                       via 10.31.90.4, eth0, weight 1, 2d19h21m
  *                       via 10.31.90.5, eth0, weight 1, 2d19h21m
  *                       via 10.31.90.6, eth0, weight 1, 2d19h21m
```