# 10.3.1 Kustomize

Kubernetes 官方对应用的定义是一组具有相同目标资源合集。在这种设定下，当应用规模稍大时，资源配置文件往往开始泛滥。尤其是当不同环境（如开发和生产环境）之间的差异较小时，你就会发现直接通过 kubectl 管理应用，十分“蛋疼”。

Kubernetes 对此的观点是，如果逐一配置和部署资源文件过于繁琐，那就将应用中的稳定信息与可变信息分离，并自动生成一个多合一（All-in-One）的配置包。完成这一任务的工具名为 Kustomize。最初，Kustomize 是一个独立的小工具，但从 Kubernetes 1.14 版本开始，它被集成到 kubectl 命令中，成为 Kubernetes 的内置功能。

Kustomize 可以理解为针对 YAML 模版引擎的变体，由它管理的应用结构主要由 base 和 overlays 目录组成。base 下存放的是原始的 Kubernetes YAML模版文件；overlays 是不同环境的差异化管理目录。两个目录内都包含一个 kustomization.yaml 文件，它本身也是一个以 YAML 格式编写的配置文件，里面定义了构成应用的全部资源，以及资源中需根据情况被覆盖的变量值。

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
只要建立多个 Kustomization 文件，开发人员就能以基于基准进行派生（Base and Overlay）的方式，对不同的模式（比如生产模式、调试模式）、不同的项目（同一个产品对不同客户的客制化）定制出一个多合一（All-in-One）配置包。
```
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

从效果上看，使用资源配置包管理应用非常方便，只要一条命令 kubectl apply -k 就可以把把应用涉及的所有资源一次部署好。

不难看出，kustomize 使用 Base、Overlay 生成最终配置文件的思路跟 Docker 分层镜像的思路非常相似。这种设计的优势是，用户可以通过类似 Git 的工作流程（ modify 和 rebase）管理海量的应用描述文件，简化不同场景下的重复配置。不过，Kustomize 最多只能算作一个简化应用部署的“小工具”，资源文件一个也没有少写，只不过减少了重复配置。对于一个应用而言，其管理需求远不止部署阶段，还涉及更新、回滚、卸载、多版本管理、多实例支持以及依赖关系维护等操作。要解决这些问题，还需要更高级的“工具”，这就是接下来要介绍的 Helm。