# 火焰图

火焰图如曲线图一样，是一种分析数据的方式，它可以更直观、更形象地展示数据，让人很容易发现数据中的隐藏信息。火焰图是定位疑难杂症的神器，比如 CPU 占用高、内存泄漏等问题。特别是 Lua 级别的火焰图，可以定位到函数和代码级别。

火焰图展现的一般是从进程（或线程）的堆栈中采集来的数据，即函数之间的调用关系。从堆栈中采集数据有很多方式，如使用SystemTap、DTrace、OProfile等

下图是一个通过systemtap定期收集，正常运行的 OpenResty 应用的火焰图，可以不用关心细节，先来个直观感受。

<div  align="center">
	<img src="/assets/chapter3/user-flamegraph.png" width = "650"  align=center />
</div>


### 什么时候是用

般来说，当发现 CPU 的占用率和实际业务应该出现的占用率不相符，或者对 Nginx worker 的资源使用率（CPU，内存，磁盘 IO ）出现怀疑的情况下，都可以使用火焰图进行抓取。另外，对 CPU 占用率低、吐吞量低的情况也可以使用火焰图的方式排查程序中是否有阻塞调用导致整个架构的吞吐量低下。

常用的火焰图有三种：
- lj-lua-stacks.sxx 用于绘制 Lua 代码的火焰图
- sample-bt 用于绘制 C 代码的火焰图
- sample-bt-off-cpu 用于绘制 C 代码执行过程中让出 CPU 的时间（阻塞时间）的火焰图

这三种火焰图的用法相似，输出格式一致，因为本章节讲解的为OpenResty的火焰图应用，所以下面只介绍最为常用的 lj-lua-stacks.sxx


### 火焰图的安装

#### 安装 SystemTap

SystemTap 是一个诊断 Linux 系统性能或功能问题的开源软件，为了诊断系统问题或性能，开发者或调试人员只需要写一些脚本，然后通过 SystemTap 提供的命令行接口就可以对正在运行的内核进行诊断调试。

安装当前内核版本对应的开发包和调试包,  rpm 包可以在该网址中下载： http://debuginfo.centos.org
```
# #Installaion:
# rpm -ivh kernel-debuginfo-common-$(uname -r).rpm
# rpm -ivh kernel-debuginfo-$(uname -r).rpm
# rpm -ivh kernel-devel-$(uname -r).rpm
```

**安装 systemtap：**

```
yum install systemtap

// 测试安装是否正常
stap -v -e 'probe vfs.read {printf("read performed\n"); exit()}'

```
### 火焰图绘制

首先，需要下载 stapxx 工具包： 该工具包中包含用 perl 写的，会生成 stap 探测代码并运行的脚本。如果是要抓 Lua 级别的情况，请使用其中的 lj-lua-stacks.sxx。 由于 lj-lua-stacks.sxx 输出的是文件绝对路径和行号，要想匹配具体的 Lua 代码，需要用 fix-lua-bt 进行转换。

```
// 获取进程PID
ps -ef | grep nginx

./samples/lj-lua-stacks.sxx --arg time=5 --skip-badvars -x 15010 > tmp.bt （-x 是要抓的进程的 pid， 探测结果输出到 tmp.bt）

./fix-lua-bt tmp.bt > flame.bt  (处理 lj-lua-stacks.sxx 的输出，使其可读性更佳)
```

下载 Flame-Graphic 生成包， 该工具包中包含多个火焰图生成工具，其中，stackcollapse-stap.pl 才是为 SystemTap 抓取的栈信息的生成工具

```
stackcollapse-stap.pl flame.bt > flame.cbt
flamegraph.pl flame.cbt > flame.svg
```
如果一切正常，那么会生成 flame.svg，这便是火焰图，用浏览器打开即可

```
如果在执行 lj-lua-stacks.sxx 的时间周期内（上面的命令是 5 秒）, 抓取的 worker 没有任何业务在跑，那么生成的火焰图便没有业务内容。为了让生成的火焰图更有代表性，我们通常都会在抓取的同时进行压测。
```

## 火焰图分析

从上图可以看出，正常业务下的火焰图形状类似的“山脉”，“山脉”的“海拔”表示 worker 中业务函数的调用深度，“山脉”的“长度”表示 worker 中业务函数占用 cpu 的比例。

