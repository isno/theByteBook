# 1.5.5 声明式设计

:::tip 声明式设计
声明式设计（Declarative）指的是一种软件设计理念和做法“我们向一个工具描述我们想要让一个事物达到的目标状态，由这个工具自己内部去解决如何令这个事物达到目标状态”。
:::

和声明式设计相对的则是过程式设计（Imperative 或 Procedural），两者的区别是：
1. 过程式设计：命令“机器”如何去做事情（how），这样不管你想要的是什么（what），它都会按照你的命令实现；
2. 声明式设计：告诉“机器”你想要的是什么（what），让机器想出如何去做（how）。

:::center
  ![](../assets/declarative.svg)<br/>
 图 1-26 命令式设计与声明式设计对比
:::

SQL 其实就是一种常见的声明式编程语言，它能够让开发者自己去指定想要的数据是什么，或者说，告诉数据库想要的结果是什么，数据库会帮我们设计获取这个结果集的执行路径，并返回结果集。

如下代码所示，使用 SQL 语言获取数据，要比自行编写处理过程去获取数据容易的多。

```sql
SELECT * FROM users WHERE gender = boy AND name LIKE 'xiaoming%';
```

接下来看看 Kubernetes 中的 yaml 。

下面的代码中定义了一个名为 nginx-deployment 的 Deployment 资源，spec 部分定义了 Deployment 的具体配置，如运行后的副本数（replicas=3）。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
```
该 yaml 文件提交给 Kubernetes 之后，Kubernetes 会创建具有三个副本的 nginx 服务实例，并将持续保证我们所期望的状态。

通过编写 yaml 文件来定义 Kubernetes 资源、服务的拓扑结构和状态，只需要表达我们的需求和意图，资源如何创建、服务如何关联，这些全部交由 Kubernetes 实现。

只描述想要什么，中间过程、细节不需关系，让工程师们通过站在更高层面写代码，更多的专注于 what，而这正是我们开发软件真正的目标。




