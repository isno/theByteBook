# 10.4.5 自动触发任务

前面我们都是通过手动创建一个 TaskRun 或者一个 PipelineRun 对象来触发任务，本节内容我们借助 Trigger 组件实现通过外部事件（比如代码仓库的 commit 事件）触发指定流水线。

:::tip

gitlab、github 的 webhook 就是一种最常用的外部事件，通过 Trigger 组件就监听这部分事件从而实现在提交代码后自动运行某些任务。
:::

Trigger 同样通过下面的几个 CRD 对象对 Tekton 进行了一些扩展：

- **EventListener**：事件监听器，是外部事件的入口 ，通常需要通过HTTP方式暴露，以便于外部事件推送，比如配置Gitlab的Webhook。
- **Trigger**：指定当 EventListener 检测到事件发生时会发生什么，它会定义 TriggerBinding、TriggerTemplate 以及可选的 Interceptor。
- **TriggerTemplate**：用于模板化资源，根据传入的参数实例化 Tekton 对象资源，比如 TaskRun、PipelineRun 等。
- **TriggerBinding**：用于捕获事件中的字段并将其存储为参数，然后会将参数传递给 TriggerTemplate。


 Tekton 触发任务工作流程如下图所示，当外部事件产生后被 EventListener 捕获后进入处理过程：

- 首先会由 Interceptors 来进行处理（如果有配置 interceptor 的话）
- Interceptors 处理完成后无效的事件就会被直接丢弃，剩下的有效事件则交给 TriggerBinding 处理
- TriggerBinding 实际上就是从事件内容中提取对应参数，然后将参数传递给 TriggerTemplate
- TriggerTemplate 则根据预先定义的模版以及收到的参数创建 TaskRun 或者 PipelineRun 对象，那么整个构建流程就自动执行了


:::center
  ![](../assets/TriggerFlow.svg)<br/>
 Tekton 触发任务工作流程 [图片来源](https://tekton.dev/docs/getting-started/triggers/)
:::



```
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: hello-listener
spec:
  serviceAccountName: tekton-robot
  triggers:
    - name: hello-trigger 
      bindings:
      - ref: hello-binding
      template:
        ref: hello-template
```

spec.resources.kubernetesResource.serviceType 定义了这个 EventListener 接收外部事件的 svc 的类型，这里选择 nodePort 编译外部调用


## TriggerTemplate

```
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: hello-template
spec:
  params:
  - name: username
    default: "Kubernetes"
  resourcetemplates:
  - apiVersion: tekton.dev/v1beta1
    kind: PipelineRun
    metadata:
      generateName: hello-goodbye-run-
    spec:
      pipelineRef:
        name: hello-goodbye
      params:
      - name: username
        value: $(tt.params.username)
```

## TriggerBinding

```
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: hello-binding
spec: 
  params:
  - name: username
    value: $(body.username)
```

```
$ kubectl apply -f trigger-binding.yaml
```


## 触发任务

```
curl -v \
   -H 'content-Type: application/json' \
   -d '{"username": "Tekton"}' \
   http://localhost:8080
```

查看执行情况

```
$ kubectl get pipelineruns
NAME                      SUCCEEDED   REASON      STARTTIME   COMPLETIONTIME
hello-goodbye-run         True        Succeeded   24m         24m
hello-goodbye-run-8hckl   True        Succeeded   81s         72s
```