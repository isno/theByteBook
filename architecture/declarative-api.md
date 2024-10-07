# 1.5.5 声明式设计

声明式设计指的是一种软件设计理念和做法：“我们向一个工具描述我们想要让一个事物达到的目标状态，由这个工具自己内部去解决如何令这个事物达到目标状态”。

和声明式设计相对的是命令式设计（又叫过程式设计），两者的区别是：
1. 命令式设计：命令“机器”如何去做事情（how），这样不管你想要的是什么（what），它都会按照你的命令实现；
2. 声明式设计：告诉“机器”你想要的是什么（what），让机器想出如何去做（how）。

很多常用的编程语言都是命令式。例如，如果有一批图书的列表，你会编写这样的代码来查询列表中名为“深入高可用原理与设计”的书籍：

```bash
function getBooks() {
  var results = []
  for( var i=0; i< books.length; i++) {
    if(books[i].name == "深入高可用原理与设计") {
      results.push(books)
    }
  }
  return results
}
```
命令式语言告诉计算机以特定的顺序执行某些操作，实现最终目标必须完全推理整个过程。

再来看使用声明式的查询语言（例如 SQL）是怎么处理的呢？如使用 SQL，只需要指定所需的数据模式，结果满足什么条件，以及如何转换数据（例如，排序、分组和聚合）。数据库会直接返回我们想要的结果，这远比自行编写处理过程去获取数据容易的多。
```sql
SELECT * FROM users WHERE gender = boy AND name LIKE '深入高可用原理与设计%';
```

接下来看以声明式设计为核心的 Kubernetes。

下面的 YAML 文件中定义了一个名为 nginx-deployment 的 Deployment 资源，spec 部分**声明**了部署后的具体状态。如运行后的副本数（replicas=3）。该 YAML 文件提交给 Kubernetes 之后，Kubernetes 会创建具有三个副本的 nginx 服务实例，并将持续保证我们所期望的状态。

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

通过编写 YAML 文件表达我们的需求和意图，资源如何创建、服务如何关联，至于怎么实现，我们完全不需要关心，这些全部交由 Kubernetes 实现。

只描述想要什么，中间过程、细节不需关心，让工程师们专注于 what，这正是我们开发软件真正的目标。




