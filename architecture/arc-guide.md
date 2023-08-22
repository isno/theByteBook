# 1.4 云原生架构落地指南


面对这庞杂的技术领域和技术工具，即便掌握了云原生核心技术 Docker 和 Kubernetes，在工程实践中还远远不够，总结来说，如果要推进云原生架构落地，需要聚焦在下面几个领域：


- 容器和镜像：Docker、containerd、CRI-O、Nydus
- 持续集成：Gitlab、Tekton
- 镜像仓库：Harbor
- 应用定义：Kustomize、Helm
- 持续部署：FluxCD、argoCD
- 容器编排：Kubernetes
- 网关：Ingress-Nginx、APISIX、Kong
- 监控：Grafana
- 告警：Prometheus
- 日志：Fluentd
- 应用开发：Nocalhost

<div  align="center">
	<img src="../assets/tech.jpeg" width = "600"  align=center />
	<p>图：CI/CD 典型工具链</p>
</div>


应用

- 使得大规模系统（涉及大量开发人员，大量基础设施）可以持续快速发布。
- 有效利用云计算基础设施的特点，让服务可以按需快速伸缩。
- 提高系统的弹性，从而获得高的可用性。



