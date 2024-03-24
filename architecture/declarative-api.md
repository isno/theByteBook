# 1.5.5 声明式设计

:::tip 声明式设计
声明式设计（Declarative）指的是一种软件设计理念和做法：“我们向一个工具描述我们想要让一个事物达到的目标状态，由这个工具自己内部去解决如何令这个事物达到目标状态”。
:::

和声明式设计相对的则是过程式设计（Imperative 或 Procedural），两者的区别是：在声明式模式中，我们描述的是目标状态（Goal State），而在过程式模式中，我们描述的是一系列的动作，这一系列的动作如果被正确的顺利执行，最终结果是这个事物达到了我们期望的目标状态的。

<div  align="center">
	<img src="../assets/declarative.svg" width = "400"  align=center />
	<p>图1-31 命令式与声明式 API 对比</p>
</div>

SQL 其实就是一种常见的声明式编程语言，它能够让开发者自己去指定想要的数据是什么，或者说，告诉数据库想要的结果是什么，数据库会帮我们设计获取这个结果集的执行路径，并返回结果集。众所周知，使用 SQL 语言获取数据，要比自行编写处理过程去获取数据容易的多。

```plain
SELECT * FROM users WHERE gender = boy AND name LIKE 'xiaoming%';
```

我们来看看相同设计的 YAML，利用它，我们可以告诉 Kubernetes 最终想要的是什么，然后 Kubernetes 会完成目标。

例如，在 Kubernetes 中，我们可以直接使用 YAML 文件定义服务的拓扑结构和状态，甚至对所有的程序、软件、系统配置以及在开发、预发布和生产环境中运行的所有内容进行编码，实现一切即代码。 

这样，我们可以在一个新的云环境中，快速启动、进行故障转移或切换到另一家云提供商的环境中。

```plain
apiVersion: v1
kind: Pod
metadata:
  name: rss-site
  labels:
    app: web
spec:
  containers:
    - name: front-end
      image: nginx
      ports:
        - containerPort: 80
    - name: rss-reader
      image: nickchase/rss-php-nginx:v1
      ports:
        - containerPort: 88
```

使用声明式，允许您对工作负载（Workload）应用程序、软件、系统配置以及在开发、预发布和生产环境中运行的所有内容进行编码，因此，我们可以在一个新的云环境中，快速启动、进行故障转移或切换到另一家云提供商的环境中


声明式 API 使系统更加健壮，在分布式系统中，任何组件都可能随时出现故障。当组件恢复时，需要弄清楚要做什么，使用命令式 API 时，处理起来就很棘手。但是使用声明式 API ，组件只需查看 API 服务器的当前状态，即可确定它需要执行的操作。

声明式设计的好处是：

- **简单** 我们不需要关心任何过程细节。过程是由工具自己内部 figure out 的、内部执行的。
- **自我描述 （self-documentation）** 因为我们描述的就是希望一个事物变成什么样子，而不是“发育”过程。

声明式作为是一种设计理念，透传出来的是“把方便留给别人，把麻烦留给自己”的哲学。如果我们使用命令式的方式进行开发，虽然在配置上比较灵活，但是带来了更多的工作。


