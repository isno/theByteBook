# 安装 Tekton

安装 Tekton 非常简单，可以直接通过 tektoncd/pipeline 的 GitHub 仓库中的 release.yaml 文件进行安装，如下所示的命令：

```
$ kubectl apply --filename https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml
```

上面的资源清单文件安装后，会创建一个名为 tekton-pipelines 的命名空间，在该命名空间下面会有大量和 tekton 相关的资源对象，我们可以通过在该命名空间中查看 Pod 并确保它们处于 Running 状态来检查安装是否成功：

```
$ kubectl get pods --namespace tekton-pipelines --watch
```