# 10.4.3 创建 Task

构建 CI/CD 系统的第一个任务是先 Clone 应用程序代码进行测试。

如下，创建一个 task-test.yaml 的资源文件，内容如下所示。

```
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: test
spec:
  resources:
    inputs:
      - name: git-repository-url
        type: git
  steps:
    - name: run-test
      image: golang:1.14-alpine
      workingDir: /workspace/repo
      command: ["go"]
      args: ["test"]
```

上面的文件中，resources 定义了任务步骤所需的输入内容，因为这个任务是 Clone 一个仓库进行集成测试，所以 Git 仓库将作为 go test 命令的输入。Tekton 内置 git 资源类型，它会自动将代码仓库 Clone 到 /workspace/$input_name 目录中，由于我们这里输入被命名成 repo，所以代码会被 Clone 到 /workspace/repo 目录下面。

然后下面的 steps 就是来定义执行运行测试命令的步骤：在根目录中运行 go test 命令。

定义完成后使用 kubectl 创建该任务。

```
$ kubectl apply -f task-test.yaml
task.tekton.dev/test created
```

但是仅创建 Task 是没有用的，Task 只是声明了我们要做什么，是一个静态的对象，如果要得到其结果，需要借助 TaskRun 才行。

接下来创建 TaskRun 对象了，内容如下所示：

```
apiVersion: tekton.dev/v1
kind: TaskRun
metadata:
  generateName: testrun
spec:
  taskRef:
    name: test
    params:
    - name: git-repository-url
      value: "https://github.com/isno/tekton-example"
```

上面通过 taskRef 引用上面定义的 Task 以及定义了名称为 git-repository-url 的参数。

:::tip 注意

TaskRun 这里没有指定 name，而是用的 generateName。同时该对象也必须使用 create 命令来创建，而不是 apply。

这是因为一个 TaskRun 只能触发一次任务运行，而一个任务可能会反复运行，如果在 TaskRun 中写死名称，就会导致该任务只会触发一次，就算 apply 多次也会因内容没有变化被忽略掉。

:::

将 TaskRun 提交到 kubernetes 之后开始运行任务。

```bash
$ kubectl create -f hello-taskrun.yaml 
```

通过 TaskRun 资源对象的状态查看构建结果。

```bash
$ kubectl get taskrun
NAME      SUCCEEDED   REASON      STARTTIME   COMPLETIONTIME
testrun   True        Succeeded   70s         57s
```

