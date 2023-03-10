# HTTP的优化与实践

HTTP紧挨着TCP，位于其上层，所以HTTP事务的性能取决于底层TCP通道的性能，在前面的章节也讲过TCP相关的策略和参数优化， 在本章节讲继续讲解依赖TCP的上层应用HTTP协议，通过介绍HTTP持久连接、管道机制、HTTP/2多路复用等技术，向读者阐述HTTP应用相关的理论实践。

### HTTP概述

Web 使用一种名为 HTTP (HyperText Transfer Protocol，超文本传输协议) 的协议作为规范的。

```
HTTP 更加严谨的译名应该是 超文本转移协议。
```

- HTTP 于 1990 年问世。那时的 HTTP 并没有作为正式的标准，因为被称为 HTTP/0.9
- HTTP 正式作为标准被公布是 1996 年 5 月，版本命名为 HTTP/1.0，记载于 RFC1945
- HTTP 在 1997 年 1 月公布了当前最主流的版本，版本命名为 HTTP/1.1，记载于 RFC2616
- HTTP/2 于 2015 年 5 月 14 日发布，引入了服务器推送等多种功能。记载于 RFC7540 
- HTTP/3 于 2022 年 6 月 6 日发布，采用了 QUIC 进行传输的新 HTTP 协议，并将TLS集成。记载于 RFC9114 



在业务场景的解决中，相对浏览器BS应用，请求的分散性、304机制以及头部阻塞等问题，移动端有很多不同点，不能一概而论。在进行HTTP类的服务配置及开发时，需针对不同场景进行考虑

<div  align="center">
	<p>图：浏览器与移动端场景区别</p>
	<img src="/assets/chapter2/http.png" width = "600"  align=center />
</div>
