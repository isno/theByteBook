# 10.4.4 构建镜像以及创建 Pipeline

我们通常使用 docker build 编译镜像，但现在大部分的 CI/CD 系统运行在容器内，那么我们就要换一种完全在容器内编译镜像的方式，这就是下面要介绍的 Kaniko。

:::tip Kaniko 是什么

Kaniko 是谷歌开源的一款构建容器镜像的工具。

Kaniko 并不依赖于 Docker 守护进程，完全在用户空间根据 Dockerfile 的内容逐行执行命令来构建镜像，这就使得在一些无法获取 docker 守护 进程的环境下也能够构建镜像。

:::

<div  align="center">
	<img src="../assets/kaniko.png" width = "500"  align=center />
	<p>Kaniko 如何工作</p>
</div>

Kaniko 读取并解析指定的 Dockerfile，先拉取基础镜像，在用户空间中重建其文件系统层，然后按顺序执行 Dockerfile 中的每条指令（如 RUN、COPY、ADD），并将更改应用到镜像层中。构建完成后，Kaniko 将最终镜像推送到指定的远端镜像仓库。


有了 Kaniko，在 Tekton 内构建镜像就变得简单了。如下定义了一个镜像编译的 Task。

```
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: build-and-push
spec:
  resources:
    inputs:
      - name: repo
        type: git
  steps:
    - name: build-and-push
      image: gcr.io/kaniko-project/executor:latest
      env:
        - name: DOCKER_CONFIG
          value: /tekton/home/.docker
      command:
        - /kaniko/executor
        - --dockerfile=Dockerfile
        - --context=/workspace/repo/src
        - --destination=arthurk/tekton-test:latest
```

Task 中的steps 就是执行 /kaniko/executor，通过 --dockerfile 指定 Dockerfile 路径，--context 指定构建上下文，我们这里当然就是项目的根目录了，然后 --destination 参数指定最终我们的镜像名称。

## 创建流水线

到目前，我们已经完成两个 Task 的创建，创建一个 Pipeline 将这两个 Task 组织起来。

```
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: hello-goodbye
spec:
  params:
  - name: username
    type: string
  tasks:
    - name: hello
      taskRef:
        name: hello
    - name: goodbye
      runAfter:
        - hello
      taskRef:
        name: goodbye
      params:
      - name: username
        value: $(params.username)
```
Pipeline 通过 spec.tasks 指定多个 task，再通过 taskRef.name 关联到具体的 Task。

:::tip 注意
 需要注意的是，tasks 中的任务不保证先后顺序，因此如果不同任务之间有依赖关系可以使用 runAfter 字段来指定先后关系。
:::


```
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  generateName: hello-goodbye-run
spec:
  pipelineRef:
    name: hello-goodbye
  params:
  - name: username
    value: "Tekton"
```

```
kubectl create -f hello-goodbye-run.yaml 
```
