# 7.7.3 调度器及扩展设计

调度器（kube-scheduler）的主要职责是为新创建的 Pod 找到最合适的节点。如果集群只有几十个节点，调度并不困难，但当节点规模达到几千甚至更大时，情况就复杂得多。

Pod 的创建/更新和节点资源无时无刻不在发生变化。如果每次调度都需要进行数千次远程请求以获取相关信息，不仅会耗时过长、可能导致调度失败，调度器频繁的网络请求也会使其成为集群的性能瓶颈。

:::tip <a/>
为了充分利用硬件资源，通常会将各种类型(CPU 密集、IO 密集、批量处理、低延迟作业)的 workloads 运行在同一台机器上，这种方式减少了硬件上的投入，但也使调度问题更加复杂。

随着集群规模的增大，需要调度的任务的规模也线性增大，由于调度器的工作负载与集群大小大致成比例，调度器有成为可伸缩性瓶颈的风险。

:::right
—— from Omega 论文
:::

Omega 的论文中提出了一种基于共享状态（图 7-1 中的 Scheduler Cache）的双循环调度机制，用来解决大规模集群的调度效率问题，这种调度机制不仅应用在 Google 的 Omega 系统中，也被 Kubernetes 继承下来。

Kubernetes 默认调度器（kube-scheduler）双循环架构如下所示。

:::center
  ![](../assets/kube-scheduler.svg)<br/>
  图 7-37 kube-scheduler 双循环架构设计
:::

从图 7-37 可以看出，Kubernetes 调度的核心就是两个互相独立的控制循环。

第一个控制循环称为 Informer 循环。该循环的主要逻辑是启动一系列 Informer 监听（Watch）API 资源（如要是 Pod 和 Node）状态的变化。当 API 资源变化时，就会触发 Informer 的回调函数进行处理。如一个待调度 Pod 被创建后，Pod Informer 的回调函数就会将其入队到调度队列中（PriorityQueue）。

此外，当上述事件触发时，Informer 还承担对调度器缓存（即 Scheduler Cache）更新的责任。缓存的主要目的是尽可能将 Pod、Node 的信息缓存化，以便提升后续调度逻辑的执行效率。

第二个控制循环称为 Scheduling 循环。该循环的核心逻辑是不断地从调度队列里出队一个 Pod。然后触发两个最核心的调度阶段：过滤阶段（也称为 Predicates）和打分阶段。Kubernetes 从 v1.15 版本起，调度器生命周期的各个关键点上，向用户暴露可以扩展和实现自定义调度逻辑的接口。用户可以编写插件注册到 Kubernetes 从而控制调度逻辑。

过滤阶段，本质是调用扩展点注册的插件（主要是 preFilter 和 filter，稍后介绍），根据插件预设的过滤策略筛选出符合 Pod 要求的 node 节点集合。Kubernetes 的调度器内置了一批过滤插件，总结它们的过滤策略如下：

- 资源过滤策略：检查节点资源是否满足 Pod 请求（request），在节点之间平衡资源分配。
- 节点过滤策略：与宿主机节点相关的策略。例如检查 Pod 是否能容忍节点的污点；确保 Pod 调度到符合亲和性条件的节点；
- 拓扑和亲和性策略：该策略主要处理 Pod 之间的亲和性规则，还有确保 Pod 在不同节点间均匀分布。

在过滤之后，得出一个节点列表，里面包含了所有可调度节点；通常情况下，这个节点列表包含不止一个节点。如果这个列表是空的，代表这个 Pod 不可调度。过滤阶段结束之后，接着进入打分阶段。

在打分阶段，调度器会为 Pod 从所有可调度节点中选取一个最合适的节点。根据当前启用调度插件的打分策略，调度器会给每一个可调度节点进行打分。得分最高的 Node 就会作为这次调度的结果。如果存在多个得分最高的节点，kube-scheduler 会从中随机选取一个。

在上述两个阶段结束之后，调度器 kube-scheduler 会将就需要将 Pod 对象的 nodeName 字段的值，修改为选中 Node 的名字，这个过程在 Kubernetes 里面被称作 Bind。为了不在关键调度路径里远程访问 API Server，Kubernetes 默认调度器在 Bind 阶段只会更新 Scheduler Cache 里的 Pod 和 Node 的信息。这种基于“乐观”假设的 API 对象更新方式，在 Kubernetes 里被称作 Assume。Assume 之后，调度器才会创建一个 Goroutine 异步地向 API Server 发起更新 Pod 的请求，kubelet 完成真正调度操作。


Kubernetes 从 v1.15 版本起，为 kube-scheduler 设计了可插拔的扩展机制 —— Scheduling Framework。它在调度器生命周期的各个关键点上（图中绿色矩形箭头框），向用户暴露可以扩展和实现自定义调度逻辑的接口。

:::center
  ![](../assets/scheduling-framework-extensions.svg)<br/>
   图 7-38 Pod 的调度上下文以及调度框架公开的扩展点
:::

有了 Scheduling Framework，在保持调度“核心”简单且可维护的同时，用户可以编写自己的调度插件注册到 Scheduling Framework 的扩展点来实现自己想要的调度逻辑。


值得注意的是，Scheduling Framework 属于 Kubernetes 内部扩展机制，需要按照规范编写 Golang 代码。

例如下面一个插件，实现 Filter 和 Score 扩展

```go
package main

import (
    "context"
    "fmt"
    "k8s.io/kubernetes/pkg/scheduler/framework"
)

type MySchedulerPlugin struct{}

// NewMySchedulerPlugin creates a new plugin.
func NewMySchedulerPlugin(_ framework.Handle) (framework.Plugin, error) {
    return &MySchedulerPlugin{}, nil
}

// Name returns the name of the plugin.
func (p *MySchedulerPlugin) Name() string {
    return "MySchedulerPlugin"
}

// 在这里添加你的过滤逻辑
func (p *MySchedulerPlugin) Filter(ctx context.Context, pod *v1.Pod, nodeName string) *framework.Status {
    // 
    nodeInfo, err := p.Handle().NodeInfo(nodeName)
    // 判断自定义的 GPU 资源是否满足
    if gpu, exists := nodeInfo.Allocatable[v1.ResourceName("nvidia.com/gpu")]; exists && gpu.Value() > 0 {
        return framework.NewStatus(framework.Success, "")
    }

    return framework.NewStatus(framework.Success, "")
}

// 在这里添加你的打分逻辑
func (p *MySchedulerPlugin) Score(ctx context.Context, pod *v1.Pod, nodes []*v1.Node) (map[string]int64, *framework.Status) {
    scores := make(map[string]int64)
    for _, node := range nodes {
        // 为 Node 打分
        scores[node.Name] = 1 // 示例分数
    }
    return scores, framework.NewStatus(framework.Success, "")
}
//其他必要的插件方法...

func main() {
    // 启动插件
}

```
编译完插件之后，将插件部署到 Kubernetes 集群中。然后，在 Kubernetes 的调度器配置中，指定你的插件。

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
  - plugins:
      score:
        enabled:
        - name: MySchedulerPlugin
      filter:
        enabled:
        - name: MySchedulerPlugin
```

有了上述的设计，特别是在处理异构资源（如 GPU、FPGA 等）的时候，你思考：“扩展和自定义 Kubernetes 调度器逻辑是不是就非常容易了？”。
