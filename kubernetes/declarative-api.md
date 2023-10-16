# 8.1 声明式 API 

声明式的东西是对最终结果的陈述，表明意图而不是实现它的过程，

Kubernetes 能力是通过各类 API 对象来提供，这些 API 对象有用来描述应用，有的则是为应用提供各种各样的服务，但无一例无，为了使用这些 API 对象提供的能力，都需要编写一个对应的 YAML 文件交给 Kubernetes。围绕使用 YAML 文件对 Pod 进行编排操作，可以分为命令式配置文件操作和声明式 API。


我们创建一个 yaml，然后进行 kubectl create -f yaml 的操作后，我们应用的 Pod 就会运行起来了，这个时候如果想要更新镜像我们可以直接修改原 yaml 文件，然后执行命令 kubectl replace -f yaml 来完成这次 deploy 的更新。

对于上面这种先 kubectl create，再 replace 的操作，我们称为命令式配置文件操作。它的处理方式只不过是把配置写在了 yaml 文件中而已。


那么，到底什么才是“声明式 API”呢？答案是，kubectl apply 命令。


kubectl replace 的执行过程，是使用新的 YAML 文件中的 API 对象，替换原有的 API 对象；而 kubectl apply，则是执行了一个对原有 API 对象的 PATCH 操作。更进一步地，这意味着 kube-apiserver 在响应命令式请求（比如 kubectl replace）的时候，一次只能处理一个写请求，否则会有产生冲突的可能。而对于声明式请求（比如 kubectl apply），一次能处理多个写操作，并且具备 Merge 能力。



## 小结

总结 Kubernetes 中的`声明式`，指的就是我们只需要提交一个定义好的 API 对象来`声明”，我所期望的状态是什么样子。然后我们允许多个 API 写端对 API 期望状态进行修改，而无需关注其他人修改了什么，最后，k8s 在无需外界干预的情况就可以完成整个实际状态到期望状态的 Reconcile，可以毫不夸张的说，声明式 API，是 k8s 项目编排能力的核心所在
