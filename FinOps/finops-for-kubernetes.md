# FinOps 成本管控实践

## 安装 Kubecost

安装 Kubecost 建议使用 Helm 进行安装，使用以下命令：
```
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm repo update
helm upgrade --install kubecost kubecost/cost-analyzer --namespace kubecost --create-namespace
```

几分钟后，检查以确保 Kubecost 已启动并运行：

```
kubectl get pods -n kubecost

# Connect to the Kubecost dashboard UI

kubectl port-forward -n kubecost svc/kubecost-cost-analyzer 9090:9090
```

现在可以打开浏览器并指向 http://127.0.0.1:9090 以打开 Kubecost UI。 在 Kubecost UI 中，选择群集以查看成本分配信息。