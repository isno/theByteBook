# Controller-Manager 和 Scheduler 

controller-manager 和 scheduler 负责 Pod 调度和各种资源对象的管理，所以同一时刻它们各自只能有一个实例工作，即它们要经过选举来决定谁作为 leader 进行工作。

这两个组件的高可用方案较为简单，只要部署至少两个节点即可，它们都有一个启动参数 --leader-elect ，默认为 true，表示当它们以多副本运行时将启用选举并尝试获得 leader 的身份。