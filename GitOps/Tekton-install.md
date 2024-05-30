# 10.4.1 安装 Tekton

安装 Tekton 非常简单，可以直接通过 tektoncd/pipeline 的 GitHub 仓库中的 release.yaml 文件进行安装，如下所示的命令：

```
$ kubectl apply --filename https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml
```

上面的资源清单文件安装后，会创建一个名为 tekton-pipelines 的命名空间，在该命名空间下面会有大量和 tekton 相关的资源对象。查看该命名空间中 Pod 状态确认安装是否成功。

```
$ kubectl get pods --namespace tekton-pipelines --watch
NAME                                           READY   STATUS             RESTARTS      AGE
tekton-pipelines-controller-6d5b665f7d-96njd   1/1     Running            0             110s
tekton-pipelines-webhook-9485cfb96-th9pt       1/1     Running            0             110s
```

安装成功后，我们可以选择继续安装 Tekton 提供的 CLI 工具或者 Dashboard 与 Tekton 交互。

如下，安装 Dashboard 可以查看 Tekton 整个任务的构建过程。

```
$ kubectl apply --filename https://storage.googleapis.com/tekton-releases/dashboard/latest/release.yaml

```