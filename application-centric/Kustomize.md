# 10.3.1 Kustomize

Kubernetes 官方对应用的定义是一组具有相同目标资源合集。这种设定下，只要应用规模稍大，资源配置文件就开始泛滥。尤其是当不同环境（如开发和生产环境）之间的差异较小时，你就会发现通过 kubectl 管理应用十分“蛋疼”。

Kubernetes 对此的观点是，如果逐一配置和部署资源文件过于繁琐，那就将应用中的稳定信息与可变信息分离，并自动生成一个多合一（All-in-One）的配置包。完成这一任务的工具名为 Kustomize。

Kustomize 可以看作是 YAML 模板引擎的变体，由它组织的应用结构有两个部分：base 和 overlays。base 目录存放原始的 Kubernetes YAML 模板文件，overlays 目录用于管理不同环境的差异。每个目录下都有一个 kustomization.yaml 配置文件，描述如何组合和修改 Kubernetes 资源。

```bash
.
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── dev/
│   │   ├── kustomization.yaml
│   │   └── patch-deployment.yaml
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── patch-deployment.yaml
│   └── prod/
│       ├── kustomization.yaml
│       └── patch-deployment.yaml
```
只要为每个环境创建对应的 kustomization.yaml 文件，使用 kubectl kustomize 命令，可以将多个资源文件（如 Deployments、Services、ConfigMaps）合并为一个最终的 YAML 配置包。这样，使用 kubectl apply -k 命令，就能一次性部署所有相关资源。

```
// 合并后的配置文件 all-in-one.yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: my-namespace
data:
  config.yaml: |
    ...
---
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secret
  namespace: my-namespace
data:
  ...
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-namespace
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: my-app-container
          image: my-app-image:v1.2.3
          ...
---
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
  namespace: my-namespace
spec:
  ports:
    - ...
  selector:
    ...
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: my-namespace
spec:
  rules:
    - host: my-app.example.com
      ...
```
不难看出，kustomize 使用 Base、Overlay 生成最终配置文件的思路跟 Docker 分层镜像的思路非常相似，只要建立多个 Kustomization 文件，开发人员就能基于基准进行派生（Base and Overlay），对不同的模式（比如生产模式、调试模式）、不同的项目（同一个产品对不同客户的客制化）定制出一个多合一配置包。

不过呢，回头看 Kustomize 只能算作一个辅助应用部署的“小工具”，配置包里面的资源一个也没有少写，只是减少了不同场景下的重复配置。对于一个应用而言，其管理需求远不止部署阶段，还涉及更新、回滚、卸载、多版本管理、多实例支持以及依赖关系维护等操作。要解决这些问题，还需要更高级的“工具”，这就是接下来要介绍的 Helm。