# 1.7 云原生时代对架构师的要求

云原生架构是优雅的、灵活的、弹性的...，无数的布道内容却未曾对云原生技术极度复杂和抽象的描述。如果你追求技术潮流，并有志构建一个高可用的云原生架构，能力要求已提升到史无前例的程度。

总结来说，云原生的实践中除掌握 Docker 和 Kubernetes，如图 1-39 所示，知晓以下几个领域尤佳。

<div  align="center">
	<img src="../assets/cloud.svg" width = "650"  align=center />
	<p>图 1-39 云原生代表技术栈</p>
</div>

1. 容器运行时：Docker、Containerd、CRI-O、Kata Containers。
2. 镜像和仓库：Harbor、Dragonfly、Nydus。
3. 应用封装：Kustomize、Helm。
4. 持续集成：Gitlab、Tekton。
5. 持续部署：ArgoCD、FluxCD。
6. 容器编排：Kubernetes。
7. 服务网格: Istio、Envoy、Linkerd。
7. 网关：Ingress-Nginx、Kong、APISIX。
8. 日志：Grafana Loki、Elastic Stack、ClickHouse。
9. 监控：Prometheus、Grafana。
10. 可观测：OpenTelemetry。
10. 应用开发：Nocalhost。

以上方案或相似或不同，如何取舍、架构如何权衡，容笔者在后续章节一一道来。



[^1]: 约束理论：在一条业务链中，瓶颈节点的节拍决定了整条链的节拍，即任何一个多阶段生产系统，如果其中一个阶段的产出取决于前面一个或几个阶段的产出，那么产出率最低的阶段决定着整个系统的生产能力。约束即阻碍企业有效扩大产出能力、降低库存和运行成本的环节。