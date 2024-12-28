# 10.3 从“构建抽象”到“应用模型”

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 3  # 定义 Nginx 的副本数量
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:latest  # 使用官方的 Nginx 镜像
          ports:
            - containerPort: 80
          volumeMounts:
            - name: nginx-config
              mountPath: /etc/nginx/nginx.conf
              subPath: nginx.conf
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
```

思考上面的例子，不难发现，这个 YAML 文件中，业务工程师真正关心的字段很少。大概只有以下信息：

```yaml
containers: 
	nginx:latest
port: 80
```
也就是说，业务工程师实际上想要的是：我要部署一个容器，容器的镜像是 nginx:latest，这个容器对外开放 80 端口。至于容器启用后有多少个副本、如何扩缩容、如何对接存储、如何设置安全策略，这是运维工程师关心的事情，跟业务工程师并没有关系。

将这样的对象暴漏给最终用户是不是简介很多了呢！这种设计“简化版”的 API 对象，就叫做“构建上层抽象”。接下来，笔者将介绍几种主流的思路供你参考。