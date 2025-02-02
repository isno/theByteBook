# 7.7.3 默认调度器及扩展设计

如果节点只有几十个，为新建的 Pod 找到合适的节点并不困难。但当节点的数量扩大到几千台甚至更多时，情况就复杂了：
- 首先，节点资源无时无刻不在变化，如果每次调度都需要数千次远程请求获取信息，势必因耗时过长，增加调度失败的风险。
- 其次，调度器频繁发起网络请求，极容易成为集群的性能瓶颈，影响整个集群的运行。

:::tip <a/>
为了充分利用硬件资源，通常会将各种类型(CPU 密集、IO 密集、批量处理、低延迟作业)的 workloads 运行在同一台机器上，这种方式减少了硬件上的投入，但也使调度问题更加复杂。

随着集群规模的增大，需要调度的任务的规模也线性增大，由于调度器的工作负载与集群大小大致成比例，调度器有成为可伸缩性瓶颈的风险。

:::right
—— from Omega 论文
:::

Omega 论文中提出了一种基于“共享状态”（Scheduler Cache）的双循环调度机制，用来解决大规模集群的调度效率问题。双循环的调度机制不仅应用在 Google 的 Omega 系统中，也被 Kubernetes 继承下来。

Kubernetes 默认调度器（kube-scheduler）双循环调度机制如图 7-36 所示。

:::center
  ![](../assets/kube-scheduler.svg)<br/>
  图 7-36 默认调度器 kube-scheduler 的双循环调度机制
:::

根据图 7-36 可以看出，Kubernetes 调度的核心在于两个互相独立的控制循环。

第一个控制循环被称为“Informer 循环”。其主要逻辑是启动多个 Informer 来监听 API 资源（主要是 Pod 和 Node）状态的变化。一旦资源发生变化，Informer 会触发回调函数进行进一步处理。例如，当一个待调度的 Pod 被创建时，Pod Informer 会触发回调，将 Pod 入队到调度队列（PriorityQueue），以便在下一阶段处理。

当 API 资源发生变化时，Informer 的回调函数还负责更新调度器缓存（Scheduler Cache），以便将 Pod 和 Node 信息尽可能缓存，从而提高后续调度算法的执行效率。

第二个控制循环是“Scheduling 循环”。其主要逻辑是从调度队列（PriorityQueue）中不断出队一个 Pod，并触发两个核心的调度阶段：预选阶段（图 7-36 中的 Predicates）和优选阶段（图 7-36 中的 Priority）。

Kubernetes 从 v1.15 版本起，为默认调度器（kube-scheduler）设计了可扩展的机制 —— Scheduling Framework。其主要目的是在调度器生命周期的关键点（如图7-37中的绿色矩形箭头框所示）暴露可扩展接口，允许实现自定义的调度逻辑。这套机制基于标准 Go 语言插件机制，需要按照规范编写 Go 代码并进行静态编译集成，其通用性相较于 CNI、CSI 和 CRI 等较为有限。
:::center
  ![](../assets/scheduling-framework-extensions.svg)<br/>
   图 7-37 Pod 的调度上下文以及调度框架公开的扩展点
:::

接下来，我们回到调度处理逻辑，首先来看预选阶段的处理。

预选阶段的主要逻辑是在调度器生命周期的 PreFilter 和 Filter 阶段，调用相关的过滤插件，筛选出符合 Pod 要求的节点集合。以下是 Kubernetes 默认调度器内置的一些筛选插件：
```go
// k8s.io/kubernetes/pkg/scheduler/algorithmprovider/registry.go
func getDefaultConfig() *schedulerapi.Plugins {
  ...
  Filter: &schedulerapi.PluginSet{
      Enabled: []schedulerapi.Plugin{
        {Name: nodeunschedulable.Name},
        {Name: noderesources.FitName},
        {Name: nodename.Name},
        {Name: nodeports.Name},
        {Name: nodeaffinity.Name},
        {Name: volumerestrictions.Name},
        {Name: tainttoleration.Name},
        {Name: nodevolumelimits.EBSName},
        {Name: nodevolumelimits.GCEPDName},
        {Name: nodevolumelimits.CSIName},
        {Name: nodevolumelimits.AzureDiskName},
        {Name: volumebinding.Name},
        {Name: volumezone.Name},
        {Name: interpodaffinity.Name},
      },
    },
}
```

上述插件本质上是按照 Scheduling Framework 规范实现 Filter 方法，根据一系列预设的策略筛选节点。它们的筛选策略可以总结为以下三类：

  - **通用过滤策略**：负责基础的筛选操作，例如检查节点是否有足够的可用资源满足 Pod 请求，或检查 Pod 请求的宿主机端口是否与节点中的端口冲突。相关插件包括 noderesources、nodeports 等。。
  - **节点相关的过滤策略**：与节点特性相关的筛选策略。例如，检查 Pod 的污点容忍度（tolerations）是否匹配节点的污点（taints），检查 Pod 的节点亲和性（nodeAffinity）是否与节点匹配，或检查 Pod 与节点中已有 Pod 之间的亲和性（Affinity）和反亲和性（Anti-Affinity）。相关插件包括 tainttoleration、interpodaffinity、nodeunschedulable 等。
  - **Volume 相关的过滤策略**：与存储卷相关的筛选策略。例如，检查 Pod 挂载的 PV 是否冲突（如 AWS EBS 类型的 Volume 不允许多个 Pod 同时使用），或者检查节点上某类型 PV 的数量是否超限。相关插件包括 nodevolumelimits、volumerestrictions 等。

预选阶段执行完毕后，会得到一个可供 Pod 调度的节点列表。如果该列表为空，表示 Pod 无法调度。至此，预选阶段宣告结束，接着进入优选阶段。

优选阶段的设计与预选阶段类似，主要通过调用相关的打分插件，对预选阶段得到的节点进行排序，选择出评分最高的节点来运行 Pod。

Kubernetes 默认调度器内置的打分插件如下所示。与筛选插件不同，打分插件额外包含一个权重属性。
```go
// k8s.io/kubernetes/pkg/scheduler/algorithmprovider/registry.go
func getDefaultConfig() *schedulerapi.Plugins {
  ...
  Score: &schedulerapi.PluginSet{
      Enabled: []schedulerapi.Plugin{
        {Name: noderesources.BalancedAllocationName, Weight: 1},
        {Name: imagelocality.Name, Weight: 1},
        {Name: interpodaffinity.Name, Weight: 1},
        {Name: noderesources.LeastAllocatedName, Weight: 1},
        {Name: nodeaffinity.Name, Weight: 1},
        {Name: nodepreferavoidpods.Name, Weight: 10000},
        {Name: defaultpodtopologyspread.Name, Weight: 1},
        {Name: tainttoleration.Name, Weight: 1},
      },
    }
    ...
}
```

优选阶段最重要的策略是 NodeResources.LeastAllocated，它的计算公式如下：

$
\text{score} = \frac{\frac{\left( \text{capacity}_{\text{cpu}} - \sum_{\text{pods}}\text{requested}_{\text{cpu}} \right) \times 10 }{\text{capacity}_{\text{cpu}}}  +  {\frac{ \left( \text{capacity}_{\text{memeory}} - \sum_{\text{pods}}(\text{requested}_{\text{memeory}})\right) \times 10 }{\text{capacity}_{\text{memeory}}}   }}{2}
$

上述公式实际上是根据节点中 CPU 和内存资源的剩余量进行打分，从而使 Pod 更倾向于调度到资源使用较少的节点，避免某些节点资源过载而其他节点资源闲置。

与 NodeResources.LeastAllocated 策略配合使用的，还有 NodeResources.BalancedAllocation 策略，它的计算公式如下：

$
\text{score} = 10 - \text{variance}(\text{cpuFraction}, \text{memoryFraction}, \text{volumeFraction}) \times 10
$

这里的 Fraction 指的是资源利用比例。笔者以 cpuFraction 为例，它的计算公式如下：

$
\text{cpuFraction} =  \frac{\text{ Pod 的 CPU 请求}}{\text{节点中 CPU 总量}} 
$


memoryFraction 和 volumeFraction 也是类似的概念。Fraction 算法的主要作用是计算资源利用比例的方差，以评估节点的资源（CPU、内存、volume）分配是否均衡，避免出现 CPU 被过度分配而内存浪费的情况。方差越小，说明资源分配越均衡，得分也就越高。

除了上述两种优选策略外，还有 InterPodAffinity（根据 Pod 之间的亲和性、反亲和性规则来打分）、Nodeaffinity（根据节点的亲和性规则来打分）、ImageLocality（根据节点中是否缓存容器镜像打分）、NodePreferAvoidPods（基于节点的注解信息打分）等等，笔者就不再一一解释了。

值得注意的是，打分插件的权重可以在调度器配置文件中进行设置，以调整它们在调度决策中的影响力。例如，如果希望更重视 NodePreferAvoidPods 插件的打分结果，可以为该插件分配更高的权重，如下所示：

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: default-scheduler
  plugins:
    score:
      enabled:
      - name: NodePreferAvoidPods
        weight: 10000
      - name: InterPodAffinity
        weight: 1
      ...
```

经过优选阶段之后，调度器根据预定的打分策略为每个节点分配一个分数，最终选择出分数最高的节点来运行 Pod。如果存在多个节点分数相同，调度器则随机选择其中一个。

选择出最终目标节点后，接下来就是通知目标节点内的 kubelet 创建 Pod 了。

在这一阶段，调度器不会直接与 kubelet 通信，而是将 Pod 对象的 nodeName 修改为选定节点的名称。kubelet 会持续监控 Etcd 中 Pod 信息的变化，发现变动后执行一个名为“Admin”的本地操作，确认资源可用性和端口是否冲突。这相当于执行一遍通用的过滤策略，对 Pod 是否能在该节点运行进行二次确认。

不过，从调度器更新 Etcd 中的 nodeName 到 kubelet 检测到变化，再到二次确认是否可调度，这一过程可能会持续一段不等的时间。如果等到所有操作完成才宣布调度结束，势必会影响整体调度效率。

调度器采用了“乐观绑定”（Optimistic Binding）策略来解决上述问题。首先，调度器更新 Scheduler Cache 里的 Pod 的 nodeName 的信息，并发起异步请求  更新 Etcd 中的远程信息，该操作在调度生命周期中称 Bind。如果调度成功了，Scheduler Cache 和 Etcd 中的信息势必一致。如果调度失败了（也就是异步更新失败），也没有太大关系。因为 Informer 会持续监控 Pod 变化，只要将调度成功、但没有创建成功的 Pod  nodeName 字段清空，然后同步至调度队列，待下一次调度解决即可。
