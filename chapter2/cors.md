# 跨域的理解与实践

当一个资源从与该资源本身所在的服务器不同的域或端口请求一个资源时，资源会发起一个跨域 HTTP 请求。比如站点 http://domain-a.com 的某 HTML 页面通过  的 src 请求 http://domain-b.com/image.jpg。网络上的许多页面都会加载来自不同域的CSS样式表，图像和脚本等资源。

出于安全原因，浏览器限制从脚本内发起的跨源HTTP请求。 例如，XMLHttpRequest和Fetch API遵循同源策略。这意味着使用这些API的Web应用程序只能从加载应用程序的同一个域请求HTTP资源，除非使用CORS头文件。

```
跨域并不一定是浏览器限制了发起跨站请求，也可能是跨站请求可以正常发起，但是返回结果被浏览器拦截了。最好的例子是 CSRF 跨站攻击原理，请求是发送到了后端服务器无论是否跨域！注意：有些浏览器不允许从 HTTPS 的域跨域访问 HTTP，比如 Chrome 和 Firefox，这些浏览器在请求还未发出的时候就会拦截请求，这是一个特例
```

<div  align="center">
	<img src="/assets/chapter2/cors.png" width = "550"  align=center />
</div>

隶属于 W3C 的 Web 应用工作组推荐了一种新的机制，即跨源资源共享（Cross-Origin Resource Sharing ) CORS。这种机制让Web应用服务器能支持跨站访问控制，从而使得安全地进行跨站数据传输成为可能。需要特别注意的是，这个规范是针对API容器的（比如说XMLHttpReques 或者 Fetch），以减轻跨域HTTP请求的风险。**CORS 需要客户端和服务器同时支持。目前，所有浏览器都支持该机制。 **

跨域资源共享标准（ cross-origin sharing standard ）允许在下列场景中使用跨域 HTTP 请求：

- 前文提到的由 XMLHttpRequest 或 Fetch 发起的跨域 HTTP 请求。
- Web 字体 (CSS 中通过 @font-face 使用跨域字体资源), 因此，网站就可以发布 TrueType 字体资源，并只允许已授权网站进行跨站调用。
- WebGL 贴图
- 使用 drawImage 将 Images/video 画面绘制到 canvas
- 样式表（使用 CSSOM）
- Scripts (未处理的异常)

把CORS分为：简单请求、预请求和附带凭证信息的请求。

### 简单请求

某些请求不会触发 CORS 预检请求。本文称这样的请求为“简单请求”，请注意，该术语并不属于 Fetch （其中定义了 CORS）规范。
简单请求可以理解为：只使用 GET, HEAD 或者 POST 请求方法。如果使用 POST 向服务器端传送数据，则数据类型(Content-Type)只能是 application/x-www-form-urlencoded, multipart/form-data 或 text/plain中的一种。


### 预请求

与前述简单请求不同，“需预检的请求”要求必须首先使用 OPTIONS 方法发起一个预检请求到服务器，以获知服务器是否允许该实际请求。"预检请求“的使用，可以避免跨域请求对服务器的用户数据产生未预期的影响。

不同于上面讨论的简单请求，“预请求”要求必须先发送一个 OPTIONS 请求给目的站点，来查明这个跨站请求对于目的站点是不是安全可接受的。这样做，是因为跨站请求可能会对目的站点的数据造成破坏。 当请求具备以下条件，就会被当成预请求处理：

- 请求以 GET, HEAD 或者 POST 以外的方法发起请求。或者，使用 POST，但请求数据为 application/x-www-form-urlencoded, multipart/form-data 或者 text/plain 以外的数据类型。比如说，用 POST 发送数据类型为 application/xml 或者 text/xml 的 XML 数据的请求。
- 使用自定义请求头（比如添加诸如 X-PINGOTHER）

### 附带凭证信息的请求

Fetch 与 CORS 的一个有趣的特性是，可以基于 HTTP cookies 和 HTTP 认证信息发送身份凭证。一般而言，对于跨域 XMLHttpRequest 或 Fetch 请求，浏览器不会发送身份凭证信息。如果要发送凭证信息，需要设置 XMLHttpRequest 的某个特殊标志位。

### JSONP与CORS的对比

- JSONP 只能实现 GET 请求，而 CORS 支持所有类型的 HTTP 请求。
- 使用 CORS，开发者可以使用普通的 XMLHttpRequest 发起请求和获得数据，比起 JSONP 有更好的错误处理。
- JSONP 主要被老的浏览器支持，它们往往不支持 CORS，而绝大多数现代浏览器都已经支持了 CORS）。
- CORS 与 JSONP 相比，无疑更为先进、方便和可靠。


// http://www.ruanyifeng.com/blog/2016/04/cors.html 