# OpenResty

OpenResty是一个基于 Nginx 与 LuaJIT 的高性能动态 Web 平台。

它打包了标准的 Nginx 核心，并集成了大量精良的 Lua 库、第三方模块以及大多数的依赖项,用于方便地搭建能够处理超高并发、扩展性极高的动态 Web 应用、Web 服务和动态网关。

现在流行的API Gateway方案很多都是基于OpenResty来设计，如Kong、Apache APISIX。


综合 OpenResty 的特性，它不仅具备 nginx 的负载均衡、反向代理及传统 http server 等功能，还可以利用 lua 脚本编程实现路由网关，实现访问认证、流量控制、路由控制及日志处理等多种功能；同时利用 cosocket 拓展和后端(MySQL、Redis、Kafaka)通信后，更可开发通用的 restful api 程序。

<div  align="center">
	<img src="/assets/chapter3/openresty.png" width = "500"  align=center />
</div> 

在OpenResty中，每个Worker使用一个luaVM，每个请求被分配到worker时，将在luaVM中创建一个coroutine协程。

OpenResty本质上是将LuaJIT的虚拟机嵌入到Nginx的管理进程和工作进程中，同一个进程内的所有协程都会共享这个虚拟机，并在虚拟机中执行Lua代码。

在性能上OpenResty接近或超过Nginx的C模块，而且开发效率更高。

## OpenResty 高效的原理

OpenResty性能高的原因可以从这几个方面解析：LuaJIT、Lua协程、cosocket。


###  Lua 和 LuaJIT 

自从 OpenResty 1.5.8.1 版本之后，由于性能优势的原因，默认捆绑的 Lua 解释器就被替换成了 LuaJIT。

LuaJIT的运行环境出了一个汇编实现的Lua解释器外，还有一个可以直接生成机器码的JIT编译器。

开始的时候，LuaJIT和标准Lua一样，Lua代码被编译成字节码，字节码被LuaJIT解释器执行， 但不同的是，LuaJIT的解释器在执行字节码的同时，会记录运行时的统计信息，
比如函数调用入口的实际运行次数，每个Lua循环的实际执行次数等。

当这些次数超过某个阈值时，便认为对应的Lua函数入口或者对应的Lua循环足够热，便会触发JIT编译器开始工作。

JIT编译器会从热函数的入口或者热循环的某个位置开始，尝试编译对应Lua代码路径。 编译的过程是把LuaJIT字节码先转化成 LuaJIT自定义的中间码（IR），然后再生成目标机器的机器码。

其次，LuJIT 还紧密结合了FFI（Foreign Function Interface），可以直接在Lua代码中调用外部的C函数或者C数据结构。

LuaJIT 的测评报告表明，在数值运算、循环与函数调用、协程切换、字符串操作等许多方面它的加速效果都很显著。凭借着 FFI 特性，LuaJIT 在那些需要频繁地调用外部 C/C++ 代码的场景，也要比标准 Lua 解释器快很多。

```
local ffi = require(ffi)
ffi.cdef [[
	int printf(const char *fmt, ...);
]]
ffi.C.prinf("hello %s", "world")

```
使用FFI库，几行代码就可以在Lua中调用C 的 printf 函数。 类似的， 我们也可以用 Nginx、OpenSSL的 C 函数来完成更多功能。


### Lua协程

ua脚本语言用标准的C语言编写并以源代码形式开放，其设计目的是嵌入应用程序中，从而为应用程序提供灵活的扩展和定制服务。目前Lua大量应用于Nginx、嵌入式设备、游戏开发等方面。

协程又称为微线程，是这一种比线程更加轻量级的存在，正如一个进程可以拥有多个线程一样，一个线程也可以拥有多个协程。Lua协程与线程类似，拥有独立的堆栈、独立的局部变量、独立的指令指针，同时又与其他协同程序共享全局变量和其他大部分东西。

线程和协程的主要区别在于，一个具有多个线程的程序可以同时运行几个线程，而协程却需要彼此协作的运行。在任一时刻只有一个协程在运行，并且这个正在运行的协程只有明确的被要求挂起的时候才会被挂起。从这里我们可以看出，协程是不被操作系统内核所管理的，而完全由程序控制（也就是用户态执行），这样带来的好处就是性能得到了极大地提升。进程和线程切换要经过用户态到内核态再到用户态的过程，而协程的切换可以直接在用户态完成，不需要陷入内核态，切换效率高，降低资源消耗。


### cosocket

> cosocket = coroutine + socket

cosocket 是 OpenResty中非常具有实用价值最高的技术， 让OpenResty用非常低廉的成本、优雅的姿势，比传统 socket 编程效率高好几倍的方式进行网络编程，无论资源占用、执行效率、并发能力都非常出色。

OpenResty中的核心技术cosocket将Lua协程和Nginx的事件机制结合在一起，最终实现了非阻塞网络IO。不仅和HTTP客户端之间的网络通信是非阻塞的，与MySQL、Memcached以及Redis等众多后端之间的网络通信也是非阻塞的。

在OpenResty中调用一个cosocket相关的网络函数，内部关键实现如图所示：

<div  align="center">
	<img src="/assets/chapter3/cosocket.png" width = "500"  align=center />
</div> 

从图中可以看出，用户的Lua脚本每触发一个网络操作，都会有协程的yield和resume。

当遇到网络IO时，Lua协程会交出控制权（yield），把网络事件注册到Nginx监听列表中，并把运行权限交给Nginx。

当有Nginx注册网络事件到达触发条件时，便唤醒（resume）对应的协程继续处理。这样就可以实现全异步的Nginx机制，不会影响Nginx的高并发处理性能。

以此为蓝图，对ngx.socket.tcp()、ngx.socket.udp()、ngx.socket.stream()、ngx.req.socket()等封装实现 connect、read、receive 等操作，形成了OpenResty目前所看到的 cosocket API。 对这些基础库的实现方法分析，读者也也可以完成不同系统或组件的对接，例如 syslog、MongoDB 等等


## OpenResty工作原理

基于Nginx使用的多模块设计思想，Nginx将HTTP请求的处理过程划分为多个阶段。这样可以使一个HTTP请求的处理过程由很多模块参与处理，每个模块只专注于一个独立而简单的功能处理，可以使性能更好、更稳定，同时拥有更好的扩展性。

在 ngx_http_core_module.h 中定义了 Nginx 处理请求的11个阶段。

```
typedef enum {
    NGX_HTTP_POST_READ_PHASE = 0,
    NGX_HTTP_SERVER_REWRITE_PHASE,
    NGX_HTTP_FIND_CONFIG_PHASE,
    NGX_HTTP_REWRITE_PHASE,
    NGX_HTTP_POST_REWRITE_PHASE,
    NGX_HTTP_PREACCESS_PHASE,
    NGX_HTTP_ACCESS_PHASE,
    NGX_HTTP_POST_ACCESS_PHASE,
    NGX_HTTP_PRECONTENT_PHASE,
    NGX_HTTP_CONTENT_PHASE,
    NGX_HTTP_LOG_PHASE
} ngx_http_phases;
```

OpenResty 基于 Nginx 也制定了 相应的 11个 `*_by_lua` 指令，它们和 Nginx 的11个执行阶段有很大的关联性。


OpenResty指令是使用Lua编写Nginx脚本的基本构建块，用于指定用户编写的Lua代码何时运行以及运行结果如何使用等。

下图显示了不同指令的执行顺序，可以帮助我们理清编写的脚本是如何运行

<div  align="center">
	<img src="/assets/chapter3/openresty-multi.png" width = "500"  align=center />
</div> 

OpenResty将我们编写的Lua代码挂载到不同阶段进行处理，每个阶段分工明确，代码独立。

其中，init_by_lua只会在Master进程被创建时执行，init_worker_by_lua只会在每个Worker 进程被创建时执行。其他的`*_by_lua` 指令则是由终端请求触发，会被反复执行。

### OpenResty 指令

OpenResty指令有不同的执行阶段，如 初始化阶段、SSL处理阶段、HTTP请求阶段等 ，下面笔者对这些指令的时机和使用进行说明。

**Nginx启动过程中嵌入Lua代码**

`init_by_lua*：` : 在Nginx解析配置文件（Master进程）时在Lua VM层面立即调用的Lua 代码

一般在 init_by_lua* 阶段，我们可以预先加载 Lua 模块和公共的只读数据，这样可以利用操作系统的COW（copy on write）特性，来节省一些内存

`init_worker_by_lua*`: 在Nginx Worker进程启动时调用，一般在init_worker_by_lua*阶段，我们会执行一些定时任务，比如上游服务节点扩所容动态感知和健康检查等，对于init_by_lua*阶段无法执行http请求的问题，也可以在此阶段的定时任务中进行。

**OpenSSL处理SSL协议时嵌入Lua代码**

`ssl_certificate_by_lua* ` ：利用OpenSSL库（要求1.0.2e版本以上）的SSL_CTX_set_cert_cb特性，将Lua代码添加到验证下游客户端SSL证书的代码前，可用于为每个请求设置SSL证书链和相应的私钥以及在这种上下文中无阻塞地进行SSL握手流量控制。

**在11个HTTP阶段中嵌入Lua代码**

`set_by_lua*` 将Lua代码添加到Nginx官方 ngx_http_rewrite_module模块中的脚本指令中执行

`rewrite_by_lua*` 将Lua代码添加到11个阶段中的rewrite阶段中，作为独立模块为每个请求执行相应的Lua代码。此阶段可以实现很多功能，比如调用外部服务、转发和重定向处理等。

`access_by_lua*`: 将Lua代码添加到11个阶段中的access阶段中执行，与`rewrite_by_lua*`类似，也是作为独立模块为每个请求执行相应的Lua代码。
此阶段的Lua代码可以进行API调用，并在独立的全局环境(即沙箱)中作为一个新生成的协程执行。一般用于访问控制、权限校验等。

`content_by_lua*`: 在11个阶段的content 阶段以独占方式为每个请求执行相应的Lua代码，用于生成返回内容。

`log_by_lua`: 将Lua代码添加到11个阶段中的log阶段中执行，它不会替换当前请求的access日志，但会在其之前运行，一般用于请求的统计及日志记录。

**在负载均衡时嵌入Lua代码**

`balance_by_lua*` : 将Lua代码添加到反向代理模块、生成上游服务地址的init_upstream回调方法中，用于upstream负载均衡控制

**在过滤响应时嵌入Lua代码**

`header_filter_by_lua*：`将Lua代码嵌入到响应头部过滤阶段中，用于应答头过滤处理。

`body_filter_by_lua*：`将Lua代码嵌入到响应包体过滤阶段中，用于应答体过滤处理。需要注意的是，此阶段可能在一个请求中被调用多次，因为响应体可能以块的形式传递。因此，该指令中指定的Lua代码也可以在单个HTTP请求的生命周期内运行多次。


在了解了OpenResty 的架构组成和基本工作原理后, 我们就可以开始着手 OpenResty 模块的开发
