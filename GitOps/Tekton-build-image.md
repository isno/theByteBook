# 10.4.4 构建镜像以及创建 Pipeline

Tekton 的任务是在 Pod 只执行，如果在再使用 docker build 的方式编译镜像，就不合适了，我们使用 Kaniko 实现完全在容器内构建镜像。 

:::tip Kaniko 是什么

Kaniko 是谷歌开源的一款构建容器镜像的工具。Kaniko 并不依赖于 Docker 守护进程，完全在用户空间根据 Dockerfile 的内容逐行执行命令来构建镜像，这就使得在一些无法获取 docker 守护 进程的环境下也能够构建镜像。

:::

:::center
  ![](../assets/kaniko.png)<br/>
  图 10-7 Kaniko 如何工作
:::

Kaniko 解析指定的 Dockerfile，先拉取基础镜像，然后按顺序执行 Dockerfile 中的每条指令（如 RUN、COPY、ADD），并将更改应用到镜像层中。构建完成后，Kaniko 将最终镜像推送到指定的远端镜像仓库。

定义了一个构建镜像的 Task，资源文件（build-and-push.yaml ）内容如下所示

```yaml
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
        - --destination=isno/tekton-test:latest
```

Task 中的 steps 执行 /kaniko/executor，通过 --dockerfile 指定 Dockerfile 路径，--context 指定构建上下文，我们这里当然就是项目的根目录了，然后 --destination 参数指定最终我们的镜像名称。

到目前，我们已经完成两个 Task 的创建，现在再用 Pipeline 将这两个 Task 组织起来。

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: test-build-push
spec:
  params:
  - name: repo
    type: string
  tasks:
   # 运行应用测试
    - name: test
      taskRef:
        name: test
      resources:
        inputs:
          - name: repo # Task 输入名称
            resource: repo # Pipeline 资源名称
    # 构建并推送 Docker 镜像
    - name: build-and-push
      taskRef:
        name: build-and-push
      runAfter:
        - test # 测试任务执行之后
      resources:
        inputs:
          - name: repo # Task 输入名称
            resource: repo # Pipeline 资源名称
```
Pipeline 通过 spec.tasks 指定多个 task，然后根据 taskRef.name 关联到具体的 Task。

:::tip <a/>
需要注意的是，tasks 中的任务不保证先后顺序，因此如果不同任务之间有依赖关系得 runAfter 字段来指定先后关系。
:::

同样的，Pipeline 提交之后并不会被执行，再创建一个 PipelineRun 实例化和执行上面的 Pipeline。
```yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  generateName: test-build-push-run
spec:
  pipelineRef:
    name: test-build-push
  params:
  - name: repo
    value: "https://github.com/isno/tekton-example"
```
使用 create 的方式将 PipelineRun 提交到 Kubernetes，之后就会触发我们的流水线任务了。

```
$ kubectl create -f test-build-push-run.yaml 
```
