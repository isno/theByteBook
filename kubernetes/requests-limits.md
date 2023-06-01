# requests 与 limits 

为了实现集群资源的有效调度和充分利用， K8s 采用 requests（(资源需求） 和 limits (资源限制) 两种限制类型来对资源进行容器粒度的分配。

每一个容器都可以独立地设定相应的 requests 和 limits 。这 2 个参数通过每个容器 containerSpec 的 resources 字段进行设置。一般来说，在调度的时候 requests 比较重要，在 schedule 阶段，在调度 pod 保证所有 pod 的 requests 总和小于 node 能提供的计算能力，在运行时 limits 比较重要，限制了运行时容器占用的资源。

```
resources:  
    requests:    
        cpu: 50m
        memory: 50Mi
   limits:    
        cpu: 100m
        memory: 100Mi
```

requests 定义了对应容器需要的最小资源量，举例来讲，比如对于一个 Spring Boot 业务容器，这里的requests必须是容器镜像中 JVM 虚拟机需要占用的最少资源，如果 JVM 实际占用的内存 Xms 超出了 K8s 分配给 pod 的内存，导致 pod 内存溢出，从而 K8s 不断重启 pod 。

limits 定义了这个容器最大可以消耗的资源上限，防止过量消耗资源导致资源短缺甚至宕机。当设置 limits 而没有设置 requests 时，Kubernetes 默认令 requests 等于 limits 。