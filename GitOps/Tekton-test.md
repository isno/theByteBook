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

定义完成后使用 kubectl 创建该任务：

```
$ kubectl apply -f task-test.yaml
task.tekton.dev/test created
```

Task 任务只是一个模版，并不会被执行，得再创建一个 TaskRun 引用它并提供所有必需输入的数据才行。


接下来我们就可以创建 TaskRun 对象了，内容如下所示：

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

上面通过 taskRef 引用上面定义的 Task 和 git 仓库作为输入

:::tip 注意

TaskRun 这里我们没有指定 name，而是用的 generateName。同时该对象也必须使用 create 命令来创建，而不是 apply。

这是因为一个 TaskRun 只能触发一次任务运行，而一个任务可能会反复运行，如果在 TaskRun 中写死名称，就会导致该任务只会触发一次，就算 apply 多次都会因为内容没有任何变化而直接被忽略掉。

:::


现在我们创建这个资源对象过后，就会开始运行了：

```
$ kubectl create -f hello-taskrun.yaml 
```

创建后，我们可以通过查看 TaskRun 资源对象的状态来查看构建状态：

```
$ kubectl get pods
NAME                READY   STATUS      RESTARTS   AGE
testrun-pod-pds5z   0/2     Completed   0          4m27s

$ kubectl get taskrun
NAME      SUCCEEDED   REASON      STARTTIME   COMPLETIONTIME
testrun   True        Succeeded   70s         57s
```

