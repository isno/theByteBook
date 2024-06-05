# 10.4.3 创建 Task

流水线的第一个任务是先 Clone 应用程序代码进行测试。先创建一个 Task 用来 Clone 程序代码并进行测试，Task 的资源文件（task-test.yaml ）内容如下所示。

```yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: test
spec:
  resources:
    inputs:
      - name: repo
        type: git
  steps:
    - name: run-test
      image: golang:1.14-alpine
      workingDir: /workspace/repo
      command: ["go"]
      args: ["test"]
```

Task 的作用是从一个 Git 仓库获取代码，并使用 golang:1.14-alpine 容器镜像在 /workspace/repo 目录下运行 go test 命令来执行测试。

将 Task 提交到 Kubernetes 集群。

```bash
$ kubectl apply -f task-test.yaml
task.tekton.dev/test created
```

Task 只是声明了我们要做什么，是一个静态的对象，如果要得到其结果，还得再定义一个 TaskRun 实例化和执行上面的 Task。

接下来创建一个 TaskRun 对象，资源文件（test-run.yaml ）内容如下所示。

```yaml
apiVersion: tekton.dev/v1
kind: TaskRun
metadata:
  generateName: test-run
spec:
  taskRef:
    name: test
    params:
    - name: repo
      value: "https://github.com/isno/tekton-example"
```

TaskRun 通过 taskRef 引用上面定义的 Task ，并传递名为 repo 的参数来执行具体。

:::tip 注意

TaskRun 没有指定 name，而是用的 generateName。同时该对象也必须使用 create 命令来创建，而不是 apply。

这是因为一个 TaskRun 只能触发一次任务运行，而一个任务可能会反复运行，如果在 TaskRun 中写死名称，就会导致该任务只会触发一次，就算 apply 多次也会因内容没有变化被忽略掉。

:::

将 TaskRun 提交到 kubernetes 集群之后 Task 开始自动执行。

```bash
$ kubectl create -f test-run.yaml 
```

查看 TaskRun 资源对象的状态确认构建结果。

```bash
$ kubectl get taskrun
NAME      SUCCEEDED   REASON      STARTTIME   COMPLETIONTIME
test-run   True        Succeeded   70s         57s
```

