# 10.4.3 创建 Task

构建 CI/CD 系统的第一个任务是先 Clone 应用程序代码进行测试。

如下，创建一个 task-test.yaml 的资源文件，内容如下所示。

```
apiVersion: tekton.dev/v1beta1
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

上面的文件中，resources 定义了任务步骤所需的输入内容，因为这个任务是 Clone 一个仓库进行集成测试，所以 Git 仓库将作为 go test 命令的输入。Tekton 内置 git 资源类型，它会自动将代码仓库 Clone 到 /workspace/$input_name 目录中，由于我们这里输入被命名成 repo，所以代码会被 Clone 到 /workspace/repo 目录下面。

然后下面的 steps 就是来定义执行运行测试命令的步骤：在根目录中运行 go test 命令。

定义完成后使用 kubectl 创建该任务：

```
$ kubectl apply -f task-test.yaml
task.tekton.dev/test created
```

Task 任务只是一个模版，并不会被执行，得再创建一个 TaskRun 引用它并提供所有必需输入的数据才行。

先创建一个 PipelineResource 对象来定义输入信息，内容如下所示：

```
apiVersion: tekton.dev/v1alpha1
kind: PipelineResource
metadata:
  name: cnych-tekton-example
spec:
  type: git
  params:
    - name: url
      value: https://github.com/isno/tekton-example/
    - name: revision
      value: master
```

定义完成后使用 kubectl 创建资源：

```
$ kubectl apply -f pipelineresource.yaml
pipelineresource.tekton.dev/arthurk-tekton-example created
```

接下来我们就可以创建 TaskRun 对象了，内容如下所示：

```
apiVersion: tekton.dev/v1beta1
kind: TaskRun
metadata:
  name: testrun
spec:
  taskRef:
    name: test
  resources:
    inputs:
      - name: repo
        resourceRef:
          name: arthurk-tekton-example
```

上面通过 taskRef 引用上面定义的 Task 和 git 仓库作为输入，resourceRef 也是引用上面定义的 PipelineResource 资源对象。

现在我们创建这个资源对象过后，就会开始运行了：

```
$ kubectl apply -f taskrun.yaml
taskrun.tekton.dev/testrun created
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

查看容器的日志信息来了解任务的执行结果信息。

```
$ kubectl logs testrun-pod-pds5z --all-containers
{"level":"info","ts":1588477119.3692405,"caller":"git/git.go:136","msg":"Successfully cloned https://github.com/arthurk/tekton-example @ 301aeaa8f7fa6ec01218ba6c5ddf9095b24d5d98 (grafted, HEAD, origin/master) in path /workspace/repo"}
{"level":"info","ts":1588477119.4230678,"caller":"git/git.go:177","msg":"Successfully initialized and updated submodules in path /workspace/repo"}
PASS
ok  	_/workspace/repo/src	0.003s
```

看到 PASS 关键词，表明我们的测试已经通过。
