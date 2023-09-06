# 1.6.7 声明式设计

Declarative（声明式设计）指的是这么一种软件设计理念和做法：我们向一个工具描述我们想要让一个事物达到的目标状态，由这个工具自己内部去解决如何令这个事物达到目标状态。

和Declarative（声明式设计）相对的是Imperative或Procedural（过程式设计）。两者的区别是：在Declarative中，我们描述的是目标状态（Goal State），而在Imperative模式中，我们描述的是一系列的动作。这一系列的动作如果被正确的顺利执行，最终结果是这个事物达到了我们期望的目标状态的。

声明式（Declarative）的编程方式一直都会被工程师们拿来与命令式（Imperative）进行对比，这两者是完全不同的编程方法。我们最常接触的其实是命令式编程，它要求我们描述为了达到某一个效果或者目标所需要完成的指令，常见的编程语言 Go、Ruby、C++ 其实都为开发者了命令式的编程方法，

声明式和命令式是两种截然不同的编程方式:

- 在命令式 API 中，我们可以直接发出服务器要执行的命令，例如： “运行容器”、“停止容器”等；
- 在声明式 API 中，我们声明系统要执行的操作，系统将不断向该状态驱动。

<div  align="center">
	<img src="../assets/declarative.svg" width = "400"  align=center />
	<p>图 1-4 命令式与声明式对比</p>
</div>

SQL 其实就是一种常见的声明式『编程语言』，它能够让开发者自己去指定想要的数据是什么。或者说，告诉数据库想要的结果是什么，数据库会帮我们设计获取这个结果集的执行路径，并返回结果集。众所周知，使用 SQL 语言获取数据，要比自行编写处理过程去获取数据容易的多。

```
SELECT * FROM users WHERE gender = boy AND name LIKE 'xiaoming%';
```

我们来看看相同设计的 YAML，利用它，我们可以告诉 Kubernetes 最终想要的是什么，然后 Kubernetes 会完成目标。

例如，在 Kubernetes 中，我们可以直接使用 YAML 文件定义服务的拓扑结构和状态：

```
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

Kubernetes 它会帮助我们从现有的状态进行迁移。

如果 Kubernetes 采用命令式编程的方式提供接口，那么工程师可能就需要通过代码告诉 Kubernetes 要达到某个状态需要通过哪些操作，相比于更关注状态和结果声明式的编程方式，命令式的编程方式更强调过程。

总而言之，Kubernetes 中声明式的 API 其实指定的是集群期望的运行状态，所以在出现任何不一致问题时，它本身都可以通过指定的 YAML 文件对线上集群进行状态的迁移，就像一个水平触发的系统，哪怕系统错过了相应的事件，最终也会根据当前的状态自动做出做合适的操作。

## 小结

声明式 API 使系统更加健壮，在分布式系统中，任何组件都可能随时出现故障。当组件恢复时，需要弄清楚要做什么，使用命令式 API 时，处理起来就很棘手。但是使用声明式 API ，组件只需查看 API 服务器的当前状态，即可确定它需要执行的操作。

声明式设计的好处是：
- **简单** 我们不需要关心任何过程细节。过程是由工具自己内部figure out的、内部执行的。
- **self-documentation** 因为我们描述的就是希望一个事物变成什么样子，而不是“发育”过程。

声明式的方式能够大量地减少使用者的工作量，极大地增加开发的效率，这是因为声明式能够简化需要的代码，减少开发人员的工作，如果我们使用命令式的方式进行开发，虽然在配置上比较灵活，但是带来了更多的工作。

Declarative作为是一种设计理念，透传出来的是“把方便留给别人，把麻烦留给自己”的哲学。Declarative模式的工具，设计和实现的难度是远高于Imperative模式的。但作为用的人来说，Declarative模式用起来舒服。

