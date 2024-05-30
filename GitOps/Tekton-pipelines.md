# 定义流水线

提前设置下 Docker Hub 的登录凭证，方便后续将镜像推送到镜像仓库。登录凭证可以保存到 Kubernetes 的 Secret 资源对象中，创建一个名为 secret.yaml 的文件，内容如下所示:

```
apiVersion: v1
kind: Secret
metadata:
  name: docker-auth
  annotations:
    tekton.dev/docker-0: https://index.docker.io/v1/
type: kubernetes.io/basic-auth
stringData:
  username: myusername
  password: mypassword
```

Secret 对象中添加了一个 tekton.dev/docker-0 的 annotation，该注解信息是用来告诉 Tekton 这些认证信息所属的 Docker 镜像仓库。

然后创建一个 ServiceAccount 对象来使用上面的 docker-auth 这个 Secret 对象，内容如下所示。

```
apiVersion: v1
kind: ServiceAccount
metadata:
  name: build-sa
secrets:
  - name: docker-auth
```

创建完成后， Tekton 的任务或者流水线的时候使用上面的 build-sa 这个 ServiceAccount 对象来进行 Docker Hub 的登录认证。

## 创建镜像任务


## 创建流水线

创建一个流水线来将这两个任务组织起来。

创建一个名为 pipeline.yaml 的文件，内容如下所示：
```
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: test-build-push
spec:
  resources:
    - name: repo
      type: git
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

需要定义流水线需要哪些资源，可以是输入或者输出的资源，在这里我们只有一个输入，那就是命名为 repo 的应用程序源码的 GitHub 仓库。接下来定义任务，每个任务都通过 taskRef 进行引用，并传递任务需要的输入参数。

```
$ kubectl apply -f pipeline.yaml
pipeline.tekton.dev/test-build-push created
```

前面我们提到过和通过创建 TaskRun 去触发 Task 任务类似，我们可以通过创建一个 PipelineRun 对象来运行流水线

```
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  name: test-build-push-run
spec:
  serviceAccountName: build-sa
  pipelineRef:
    name: test-build-push
  resources:
    - name: repo
      resourceRef:
        name: cnych-tekton-example
```

定义方式和 TaskRun 几乎一样，通过 serviceAccountName 属性指定 ServiceAccount 对象，pipelineRef 关联流水线对象。同样直接创建这个资源，创建后就会触发我们的流水线任务了。

