# 10.4.4 构建镜像以及创建 Pipeline

我们编译镜像大部分使用 docker build 的方式，而现在大部分的 CI/CD 系统运行在容器内，那么我们就要换一种完全在容器内编译镜像的方式，这就是下面要介绍的 Kaniko。

:::tip Kaniko 是什么

Kaniko 是谷歌开源的一款构建容器镜像的工具。

Kaniko 并不依赖于 Docker 守护进程，完全在用户空间根据 Dockerfile 的内容逐行执行命令来构建镜像，这就使得在一些无法获取 docker 守护 进程的环境下也能够构建镜像。

:::

<div  align="center">
	<img src="../assets/kaniko.png" width = "500"  align=center />
	<p>Kaniko 如何工作</p>
</div>

Kaniko 会先提取基础镜像(Dockerfile FROM 之后的镜像)的文件系统，然后根据 Dockerfile 中所描述的，一条条执行命令，每一条命令执行完以后会在用户空间下面创建一个 snapshot，并与存储与内存中的上一个状态进行比对，如果有变化，就将新的修改生成一个镜像层添加在基础镜像上，并且将相关的修改信息写入镜像元数据中。等所有命令执行完，kaniko 会将最终镜像推送到指定的远端镜像仓库。


## 集成 Kaniko 到 Tekton 流水线

有了 kaniko，在 Pod 内构建镜像就变得简单了。如下定义了一个镜像编译的 Task。

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

上面的 Task 中，将将 git 作为输入，定义了一个名为 build-and-push 的步骤。

执行的命令就是 /kaniko/executor，通过 --dockerfile 指定 Dockerfile 路径，--context 指定构建上下文，我们这里当然就是项目的根目录了，然后 --destination 参数指定最终我们的镜像名称。

## 创建流水线

到目前，我们已经完成两个 task 的创建，现在我们创建一个流水线来将这两个任务组织起来。

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
pipeline 中通过 spec.tasks 指定多个 task，每个 task 里通过 taskRef.name 关联到具体的 task 实例。然后在 spec.tasks 里也需要再次定义 params，不过 task 里直接通过 $(params.username) 获取具体值。

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
