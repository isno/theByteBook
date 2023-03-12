# OpenResty模块编写

基于LuaJIT和不同阶段的请求处理，从而轻松扩展 Nginx 业务是 OpenResty 大行其道的原因。

同时Lua也是一种小巧的脚本语言，可以很轻松的上手，但弱变量型的脚本也意味对开发者有更高的技术要求。 

虽然 OpenResty 看起来简单，但是它背后隐藏了很多流程和细节 特别是在网关这种流量关键入口，不恰当的处理非常容易造成严重的故障。B站在2021年发生的严重宕机事件，就是由一个 OpenResty 模块的弱变量处理引起。

## Lua 模块开发示例

后期不论Kong或者 Apache APISIX，业务插件的编写基于 OpenResty 11个阶段的方式，我们先来了解OpenResty 模块如何编写


在Lua中创建一个模块最简单的方法是：创建一个table，并将所有需要导出的函数放入其中，最后返回这个table就可以了，相当于将导出的函数作为table的一个字段，在Lua中函数是第一类值，提供了天然的优势。

笔者在下面编写一个简单的OpenRestry Hello 模块，以供读者参考：

首先在OpenResty目录建立一个Lua业务目录模块，放置我们的Lua业务代码。

现在让我们在 Lua 子目录下创建我们自己的 Lua 模块文件，命名为 hello.lua

```
vim lua/test.lua
```

进行如下操作

- 声明 Lua 模块表 `_M`
- 给这个 Lua 模块添加一个名为 hello 的函数
- 返回模块表, 以供 OpenResty 调用

```
local _M = {}

function _M.hello()
    ngx.say("hello")
end

return _M
```

现在，简单的模块已经编辑好了，我们将它嵌入到 Nginx Conf中

- 在 http {} 配置块中，告诉 OpenResty 我们的 Lua 模块在哪里
- 在 location 中 配置 content_by_lua_block
- 使用 require 内置函数加载 Lua 模块 hello

```
http {
	init_by_lua_block {
        require "resty.core"
    }
    lua_package_path "$prefix/lua/?.lua;;";
    server {
        listen 8080 reuseport;
        location / {
            default_type text/plain;
            content_by_lua_block {
                local test = require "test"
                test.hello()
            }
        }
    }
}
```

> $prefix 可以用过 OpenResty -p 参数指定
> init_by_lua_block 预先加载 test 模块 

启动Nginx服务，对URL进行测试

```
curl 'http://127.0.0.1:8080/'
```
## OpenResty 限速模块的开发

在网关服务中，限流和熔断是一个非常重要的需求。限流用来保障有限资源最大化的服务能力，熔断用来处理请求快速返回，避免堵塞在网关，造成网关故障。

在开源社区，或者 OpenResty 自身集成， 有大量成熟的基础模块，我们可以直接拿来复用进行业务开发。

### 理解限速的算法

限速看起来简单，但工程实践中往往实现中有各类错误，或者理解不到位。比如笔者不止一次看到项目中使用计数器的方式进行限速，关键时候项目崩溃了，还真不冤枉。

就算理解了限速的原理，比如漏桶的限速中 burst常常设置的不合理，从而无法实现预期。 所以笔者在这里赵忠 讲解 漏桶（Leaky Bucket）、令牌桶（Token Bucket）大致原理， 后面再基于lua-resty-limit-traffic实现漏桶算法的限流。

**漏桶(Leaky Bucket)**

<div  align="center">
	<img src="/assets/chapter3/leaky-bucket.png" width = "450"  align=center />
</div>

漏桶算法的特点在于其通过请求的速率是恒定的，可以将流量整形的非常均匀，即便同时有 100 个请求也不会一次性通过，而是按一定间隔慢慢放行，这对后端服务迎接突发流量非常友好。

**令牌桶（Token Bucket）**

令牌桶，顾名思义桶里放的是一些令牌，这些令牌会按一定的速率往桶里放，假如每分钟限制 10 个请求，那么每分钟就往桶里放 10 个令牌，请求进来的时候需要先在令牌桶里拿令牌，拿到令牌则请求被放行，桶为空拿不到则意味着该请求被拒绝掉。

<div  align="center">
	<img src="/assets/chapter3/token-bucket.png" width = "450"  align=center />
</div>

### 漏桶算法原理

令牌桶跟漏桶的实现效果差不多，这里主要细讲漏桶的算法和实现。假设速率限制是每分钟 3 个请求，即 rate = 3r/min = 1r/20s

<div  align="center">
	<img src="/assets/chapter3/leaky-bucket-1.png" width = "460"  align=center />
</div>

如图所示，假设第 10 秒进来第一个请求，因为之前一直都没有请求进入，所以该请求被允许通过。记录下近期一次的访问时间，即为本次请求通过时间点。

现在第 20 秒又过来一个请求，20 秒相对于 10 秒钟经过了 10 秒钟，按照计算只允许被通过 0.5 个请求，那请求就被拒绝掉了。这个 last 值还是保持近期一次一个请求通过的时间。

第 30 秒又来了一个请求：如果将 30 秒看作是近期一次更新时间，相当于是 30 秒减 10 秒，也就是经过了 20 秒，而我们的限制是每 20 秒允许 1 个请求，那么这个请求会被放过去，last 值现在已经变成了 30 秒。

上述分析可以发现，漏桶限制非常严格，即便请求是第 29 秒进来也不能被通过，因为必须要经过 20 秒才允许通过一个请求，这可能会给业务带来一个问题：例如现在每分钟允许通过 3 个请求，用户可能需要在前 10 秒钟把三个请求发完，这种需求在这种算法下不会被允许。因为从发掉第一个请求到发第二个请求必须要间隔 20 秒才可以，为了弥补这种缺陷，需要引用另外一个参数 burst（爆发），允许突然爆发的请求。

<div  align="center">
	<img src="/assets/chapter3/leaky-bucket-2.png" width = "460"  align=center />
</div>

如图中所示，40 秒距离 30 秒实际上只经过了 10 秒钟，按照之前的算法计算只被允许访问 0.5 个请求，实际上应该被拒绝掉，但是我们允许它提前多访问一个请求（burst 为1），算下来就是 0.5+1=1.5 个请求。

<div  align="center">
	<img src="/assets/chapter3/leaky-bucket-3.png" width = "460"  align=center />
</div>


45 秒又来了一个请求，尽管这个请求来时，我们也允许它提前访问。但由于上一次最后访问时间已经是 50 秒了，而且在通过计算得出不到一个请求时，这一个请求也就被拒绝掉了，时间戳 last 还是 50 秒。

漏桶算法核心的地方在于我们在实现的时候保存最后一次的通过时间，新请求来的时候，用当前的时候减去之前的时间，然后拿到可以允许通过的请求个数。如果能通过，就把最后一次请求时间改成当前的时间；不能通过，当前最后一次请求时间还是不变。

如果我们要添加 burst 的功能，即提前允许它访问多少个请求的时候，last 时间可能不再是最后一次放过去的时间，而是相对于之前最后一次请求的时间，它增长了多少个请求的时间，而这个 last 时间可能会超过请求的时候，总的来看主要核心的变量就是 last 的时间戳和 burst。

## 限流的实践

那么下面我们开始开发一个限流模块

限制 ip 每分钟只能调用 120 次 /test 接口（平滑处理请求，即每秒放过2个请求），超过部分进入桶中等待，（桶容量为60），如果桶也满了，则进行限流

初始化导入 resty.core 依赖模块

```
http {
	init_by_lua_block {
    	require "resty.core"
	}
}
```

```
server {
	lua_shared_dict my_limit_req_store 100m;

	location  / {
		access_by_lua_block {
		    local limit_conn = require "resty.limit.req"
		    -- 这里设置rate=2/s，漏桶桶容量设置为60，
		    -- 因为resty.limit.req代码中控制粒度为毫秒级别，所以可以做到毫秒级别的平滑处理
		    local lim, err = limit_req.new("my_limit_req_store", 2, 60)

		    if not lim then
		        ngx.log(ngx.ERR, "初始化失败 ", err)
		        return ngx.exit(500)
		    end
		 	-- 使用客户端IP作为key，也可以使用 ngx.req.get_headers() 获取HTTP头部信息的用户参数作为key
		    local key = ngx.var.binary_remote_addr
		    local delay, err = lim:incoming(key, true)

		    if not delay then
		        if err == "rejected" then
		            return ngx.exit(503)
		        end
		        ngx.log(ngx.ERR, "failed to limit req: ", err)
		        return ngx.exit(500)
		    end
		}
		proxy_pass http://127.0.0.1:8082;
		...
 	}
}
```
