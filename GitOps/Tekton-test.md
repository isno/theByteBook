# 10.4.3 创建 Task

流水线的第一个任务是从 Git 仓库中拉取代码进行集成测试。

先创建一个 Task 类型的 yaml 文件（task-test.yaml），其内容如下所示：

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
上面代码的作用是从一个 Git 仓库拉取代码，使用 golang:1.14-alpine 镜像在 /workspace/repo 目录下运行 go test 命令执行测试。

将 Task 提交到 Kubernetes 集群。

```bash
$ kubectl apply -f task-test.yaml
task.tekton.dev/test created
```

Task 只是声明了我们要做什么，如果要真正执行任务，还得再定义一个 TaskRun 对象，用来实例化和执行上面的 Task。

接下来创建一个 TaskRun 类型的 yaml 文件（test-run.yaml），其内容如下所示：

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

上面的代码中，TaskRun 通过 taskRef 关联名称为 test 的 Task ，并传递名为 repo 参数给 Task。

:::tip 注意
TaskRun 没有指定 name，是用的 generateName，该对象也必须使用 create 命令来创建，而不是 apply。

这是因为一个任务可能会反复运行，如果在 TaskRun 中写死名称，会导致该任务只会触发一次，就算 apply 多次也会因内容没有变化被忽略掉。
:::

将 TaskRun 提交到 Kubernetes 集群之后，测试 Task 开始自动执行。

```bash
$ kubectl create -f test-run.yaml 
```

在 Kubernetes 集群中，查看 TaskRun 的状态确认运行结果。

```bash
$ kubectl get taskrun
NAME      SUCCEEDED   REASON      STARTTIME   COMPLETIONTIME
test-run   True        Succeeded   70s         57s
```

