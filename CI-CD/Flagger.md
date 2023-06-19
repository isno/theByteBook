# Flagger


Istio 而我们需要的更多是进行金丝雀发布之后指标的监控，流量的调整以及出现问题后的及时回滚。而 Flagger 就是这样一个帮助我们解决上面这些问题的开源工具


Flagger 是一种渐进式交付工具，可自动控制 Kubernetes 上应用程序的发布过程。通过指标监控和运行一致性测试，将流量逐渐切换到新版本，降低在生产环境中发布新软件版本导致的风险。

Flagger 使用 Service Mesh（App Mesh，Istio，Linkerd）或 Ingress Controller（Contour，Gloo，NGINX）来实现多种部署策略（金丝雀发布，A/B 测试，蓝绿发布）。对于发布分析，Flagger 可以查询 Prometheus、Datadog 或 CloudWatch，并使用 Slack、MS Teams、Discord 和 Rocket 来发出告警通知。