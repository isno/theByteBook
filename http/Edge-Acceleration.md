# 2.7 对网络请求进行“动态加速”

区别于 CDN，“动态加速”并非依赖缓存数据，而是通过对 IP 路由、传输协议的优化来实现网络加速。

目前，主流的技术服务商，如 Akamai、Fastly、Amazon CloudFront 和 Microsoft Azure 等全球多个地区部署了数量庞大的边缘服务器，构建了一个庞大的全球性加速网络。

使用上述服务商提供的“动态加速”，一般将域名的解析记录 CNAME 到服务商提供的域名后，整个加速过程就能自动实现。操作流程大致如下：

1. 源站（Origin）将域名 CNAME 到 CDN 服务商提供的域名，例如将 www.thebyte.com.cn CNAME  到 thebyte.akamai.com。
2. 源站提供一个 20KB 左右的用于探测网络质量的文件资源。
3. 服务商在源站周边选择一批候选的转发节点（Relay Node）。
4. 转发节点对测试资源进行下载测试，多个转发节点多路探索后，根据丢包率、RTT、路由的 hops 数等，选择出一条客户端（End Users）到源站之间的最佳的路由线路。

:::center
  ![](../assets/dsa.png)<br/>
 图 2-24 DSA 服务网络加速原理 [图片来源](https://www.cdnetworks.com/cn/web-performance/dynamic-web-acceleration/)
:::


根据笔者使用 Akamai 加速服务后的效果数据看，HTTP 请求的延迟降低了 30% 右，如表 2-4 所示。

:::center
表 2-4 网络直连与使用动态加速的效果对比
:::
客户端区域| 客户端与服务端直连| 客户端使用 Akamai 加速| 效果提升
:---|:--:|:--:|:--
Bangkok|0.58s|0.44s|31%
jakarta|0.57s|0.44s|31%
Kuala Lumpur|0.52s|0.38|36%
Taibei|0.51s|0.40s|37%
Hanoi Bac Mai|0.54s|0.41s|30%
Singapore|0.58s|0.39s|48%
Hong Kong|0.38s|0.24s|58%
Tokyo|0.60s|0.45s|32%
Surabaya|0.67s|0.52s|29%
Manila|0.46s|0.34s|36%

[^1]: AS（Autonomous System，自治系统）具有统一路由策略的巨型网络或网络群组，每个自治系统被分配一个唯一的 AS 号，各个 AS 之间使用 BGP 协议进行识别和通告路由，全世界最大规模的 AS 网络就是互联网。
[^2]: 笔者曾在上海使用 mtr 工具测试一个新加坡节点路由状态，数据包先到香港 AS，香港转到美国 AS，再从美国转到新加坡 AS。
