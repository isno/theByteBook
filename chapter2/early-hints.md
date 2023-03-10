# 使用Early Hints

Early Hints 是一种http请求码(103 Early Hints), 用来在html最终响应之前发送初步的HTTP响应。
当服务器生成html的同时，它允许服务器向浏览器发送关于关键静态资源（比如css、重要js）或html要使用的其他静态资源的hints。浏览器可以使用hints来做些连接预热和请求这些静态资源。

严格来说，Early Hints是一个网页标准，定义了新的HTTP状态代码103 Early Hints，其定义了客户端和服务器之间新的交互行为，在服务器准备200 OK回应时，HTTP服务系统便会先向客户端浏览器发送103，并包含呈现网页所需要资源的提示，该提示有助于加速页面加载，以有效减少用户可感知到的延迟。


使用Early Hints的请求/响应周期示例

**Client request:**
```
GET / HTTP/1.1 
Host: example.com
```
**Server responses:**
```
HTTP/1.1 103 Early Hints
     Link: </style.css>; rel=preload; as=style
     Link: </script.js>; rel=preload; as=script
```

**⏱...Server Think Time…⏱**

Full Response

```
HTTP/1.1 200 OK
     Date: Thurs, 16 Sept 2021 11:30:00 GMT
     Content-Length: 1234
     Content-Type: text/html; charset=utf-8
     Link: </style.css>; rel=preload; as=style
     Link: </script.js>; rel=preload; as=script

[Rest of Response]
```

<div  align="center">
	<p>图：Early Hints</p>
	<img src="/assets/chapter2/early-hints.png" width = "380"  align=center />
</div>



#### Early Hints的应用

在开始使用之前，可能要先思考下，什么样的网站比较适合这个优化。
如果你的网站的主页面响应非常快，可能没什么必要。比如对于大部分 SPA（单页应用），可能用处不是那么大。

在 SPA 中，大部分的逻辑都在客户端，HTML 很小，下发 HTML 的服务器也基本就是没有什么逻辑的静态服务器。大部分情况下只会包括一个 Root 节点，以及一些资源的 Link，大部分逻辑和加载时间其实都在打包后的 JavaScript 中。这种情况我们只需要使用常规的 rel=preload、rel=preconnect 等手段就可以了。

但是在SSR 项目中，加载 HTML 往往需要在服务端花费更多的时间，因为服务端可能和数据库交互以及将数据拼接成 HTML 元素。相比之下，加载其他的脚本和样式资源可能花费的时间要更短一点，这种站点启用 Early Hints 是比较合适。

在在 Shopify 和 Cloudflare测试中，可以观察到网页内容在浏览器中的加载处理中，LCP指标大概提升了30%。

<div  align="center">
	<p>图：启用 Early Hints 前后对比</p>
	<img src="/assets/chapter2/early-hints2.png" width = "480"  align=center />
</div>


Google Chrome 103版本已经支持之外，Microsoft Edge和Mozilla Firefox也已经开始着手支持计划。

在服务端，Nginx、H2O、Node.js(通过Fastify)等也提供了该特性的支持。







