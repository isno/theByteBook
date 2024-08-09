# 2.4 对传输内容进行压缩

对传输内容进行压缩是提升 HTTP 服务可用性的关键手段。例如，使用 Gzip 压缩后，一个 100KB 的文件通常会减少到 30KB，体积降低 70%。这不仅提高了网络传输效率，还能减少带宽成本。。

所有现代浏览器、客户端和 HTTP 服务器软件都支持压缩技术。唯一需要协商的是客户端和服务端采用的压缩算法。具体使用何种压缩算法由 HTTP 客户端和服务器通过主动协商机制确定（如图 2-8 所示）：
1. HTTP 客户端发送 Accept-Encoding 首部（包含它所支持的压缩算法，以及各自的优先级），
2. 服务器则从中选择它支持一种算法，使用该算法对响应的消息主体进行压缩，并且发送 Content-Encoding 头部信息来告知 HTTP 客户端它选择了哪一种算法。


:::center
  ![](../assets/compress.png)<br/>
  图 2-8 HTTP 压缩算法协商过程
:::

默认情况下，一般使用 Gzip 对内容进行压缩，但针对 HTTP 类型内容还有一个更高压缩率的算法 Brotli。

Brotli 是 Google 推出的开源无损压缩算法。Brotli 内部包含一个预定义的字典，涵盖了超过 1,300 个常用单词和短语，Brotli 在压缩过程中将这些常见的词汇和短语作为整体进行匹配，从而大幅提升文本型内容（ HTML、CSS 和 JavaScript 文件）的压缩密度。

如图 2-9 所示，各类型压缩算法在不同压缩等级下的效果对比。可以看到，Brotli 压缩效果比常用的 Gzip 高出 17% 至 30%。

:::center
  ![](../assets/brotli.jpeg)<br/>
  图 2-9 Brotli、Zopfli、gzip 压缩算法在不同压缩等级下的压缩率对比
:::

使用 Brotli 时，服务端和客户端（如 Chrome、Firefox 和 Opera 等主要浏览器已支持）需要额外的支持。服务端在安装 Brotli 后，可以与 gzip 一同启用，客户端会根据需要选择合适的压缩算法。

如下为 Nginx 中的 Brotli 配置示例。

```nginx
http {
	brotli on; // 开启 brotli 压缩
    brotli_comp_level 6;  // 设置压缩等级
    brotli_buffers 16 8k; // 设置缓冲的数量和大小
    brotli_min_length 20; // 压缩的最小长度
    brotli_types text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript application/javascript image/svg+xml; // 压缩类型
}
```