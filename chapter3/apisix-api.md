# API 操作实例

对APISIX API的操作，我们可以使用 RESTful Admin API接口， 当然如果您只是在项目中轻度使用，则可使用APISIX Dashboard 进行视图化管理。 

笔者在这里使用 Admin API 创建一个路由并配置上游， 您可以在此了解 APISIX 的技术概念 和 操作流程。


在操作之前，我们先了解几个 APISIX中的概念

|短语|释义|
|:--|:--|
|Upstream| 即上游. 上游的作用是按照配置规则对服务节点进行负载均衡，它的地址信息可以直接配置到路由或服务上, 在路由或服务中使用上游的 ID 方式引用上游，以此降低维护成本。|
|Route| 即路由，是 APISIX 中最基础和最核心的资源对象。 APISIX 可以通过路由定义规则来匹配客户端请求，根据匹配结果加载并执行相应的插件，最后把请求转发给到指定的上游服务。路由中主要包含三部分内容：匹配规则、插件配置和上游信息。|
|Service | 即 服务， 是某类 API 的抽象（也可以理解为一组 Route 的抽象）。它通常与上游服务抽象是一一对应的，Route 与 Service 之间，通常是 N:1 的关系。|

## API 发布

在下述示例中，我们将使用 Admin API 创建一个 Route 并与 Upstream 绑定，当一个请求到达 APISIX 时，APISIX 会将请求转发到指定的上游服务中。

```
curl "http://127.0.0.1:9180/apisix/admin/routes/1" -H "X-API-KEY: edd1c9f034335f136f87ad84b625c8f1" -X PUT -d '
{
  "methods": ["GET"],
  "host": "thebyte.com.cn",
  "uri": "/anything/*",
  "upstream": {
    "type": "roundrobin",
    "nodes": {
      "httpbin.org": 1
    }
  }
}'
```

该配置意味着，当请求满足下述的所有规则时，请求将被转发到上游服务（httpbin.org:80）：

- 请求的 HTTP 方法为 GET
- 请求的 Host 为 thebyte.com.cn
- 请求路径匹配 /anything/*

当路由创建完成后，可以通过以下命令访问上游服务：

```
curl -i -X GET "http://127.0.0.1:9080/anything/foo?arg=10" -H "Host: thebyte.com.cn"

```
该请求将被 APISIX 转发到 http://httpbin.org/anything/foo?arg=10

通过上的操作，其实也不难理解，相当于 在 nginx.conf 中配置 了一个 proxy_pass 到 httpbin.org的 upstream， 且 location 的转向 正则为 `/anything/*`。

完成上述步骤后，APISIX 就可以正常运行了。

如果想利用 APISIX 实现身份验证、安全性、限流限速和可观测性等功能，可通过添加插件实现

## API 保护

在 OpenResty 篇，笔者讲述了 基于 limit-req 限流的开发。 APISIX 实现限流的原理也是如此， 只不过在操作上 APISIX 进行了聚合， 对开发人员而言，只要进行 一个 RESTful API操作，就可实现  OpenResty 中的限流功能。

接下来，我们将以 limit-count 插件为例，通过对API发布中创建的`/anything/*` 添加一个限流插件， 为你介绍如何保护您的 API。

```
curl "http://127.0.0.1:9180/apisix/admin/routes/1" -H "X-API-KEY: edd1c9f034335f136f87ad84b625c8f1" -X PATCH -d '
{
 	"plugins": {
	    "limit-count": {
	    	"count": 2,
	        "time_window": 60,
	        "rejected_code": 503,
	        "key_type": "var",
	        "key": "remote_addr"
	    }
   }
}'
```

以上配置中，我们修改上面创建的 route 1 ，增加了 limit-count 插件。该插件仅允许客户端在 60 秒内，访问上游服务 2 次，超过两次，则会返回 503 错误码。

### 测试插件

```
curl http://127.0.0.1:9080//anything/11  -H "Host: thebyte.com.cn"
```

使用上述命令连续访问三次后，则会出现如下错误。

```
503 Service Temporarily Unavailable
```
