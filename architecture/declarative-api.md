# 1.5.5 声明式设计

声明式设计是指一种软件设计理念：“我们描述一个事物的目标状态，而非达成目标状态的流程”。至于目标状态如何达成，则由相应的工具在其内部实现。

和声明式设计相对的是命令式设计（又叫过程式设计），两者的区别是：
1. 命令式设计：命令“机器”如何去做事情（how），这样不管你想要的是什么（what），它都会按照你的命令实现；
2. 声明式设计：告诉“机器”你想要的是什么（what），让机器想出如何去做（how）。

很多常用的编程语言都是命令式。例如，有一批图书的列表，你会编写下面类似的代码来查询列表中名为“深入高可用系统原理与设计”的书籍：

```bash
function getBooks() {
  var results = []
  for( var i=0; i< books.length; i++) {
    if(books[i].name == "深入高可用系统原理与设计") {
      results.push(books)
    }
  }
  return results
}
```
命令式语言告诉计算机以特定的顺序执行某些操作，实现最终目标：“查询名为《深入高可用系统原理与设计》的书籍”，必须完全推理整个过程。

再来看声明式的查询语言（如 SQL）是如何处理的呢？

使用 SQL，只需要指定所需的数据、结果满足什么条件以及如何转换数据（如排序、分组和聚合），数据库直接返回我们想要的结果。这远比自行编写处理过程去获取数据容易的多。
```sql
SELECT * FROM books WHERE author = 'xiaoming' AND name LIKE '深入高可用系统原理与设计%';
```

接下来，再看以声明式设计为核心的 Kubernetes。

下面的 YAML 文件中定义了一个名为 nginx-deployment 的 Deployment 资源。其中 spec 部分**声明**了部署后的具体状态（以 3 个副本的形式运行）。

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
该 YAML 文件提交给 Kubernetes 之后，Kubernetes 会创建拥有 3 个副本的 nginx 服务实例，将持续保证我们所期望的状态。

通过编写 YAML 文件表达我们的需求和意图，资源如何创建、服务如何关联，至于具体怎么实现，我们完全不需要关心，全部甩手给 Kubernetes。

只描述想要什么，中间流程、细节不需关心。工程师们专注于 what，正是我们开发软件真正的目标。




