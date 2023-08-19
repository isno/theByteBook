# 2.3.2 公网加速方案 Anycast

Anycast(任意播) 是一种网络寻址和路由方法，允许多个节点共享一个 IP 地址。使用 Anycast 技术，可以将流量请求路由到就近节点中，多用在网络加速、多地同服场景。

大型的互联网服务商通常使用 Anycast 构建异地多活的高可用架构。例如，用 Anycast 扩展 DNS 的 NameServer 服务。在 DNS 解析上下文中，Anycast 会将传入的流量路由到距离最近并且能够有效处理请求的数据中心，选择性路由使 Anycast 网络能够应对延迟、高流量、网络拥塞和 DDoS 攻击等问题。

## 1. Anycast 原理

到目前为止，AnyCast 技术落地的问题是如何在 IPv4 实现 Anycast 。好在有 BGP 协议帮忙，在一个大型的网络内，多个不同的路由器都发布同样 IP 路由，根据 BGP 协议，不同的客户端被路由到不同路由器节点上，再由路由器选择对应节点传输数据，就可实现 IPv4 网络下 AnyCast 架构。

<div  align="center">
	<img src="../assets/same-anycast-IP.png" width = "400"  align=center />
</div>

## 2. Anycast 优势

- **更低的网络延迟** 进入任播节点的流量将被路由到最近的节点，从而减少客户端和节点本身之间的延迟。这确保了无论客户端从何处请求信息，速度都将得到优化。
- **更高的可用性** Anycast 通过使用相同的 IP 在全球范围内放置多个服务器来提高冗余度。这允许在一台服务器出现故障或离线的情况下将流量重新路由到下一个最近的服务器。
- **DDoS 缓解** DDoS 攻击是由僵尸网络引起的，僵尸网络可以产生如此多的流量，以至于使典型的单播机器不堪重负。在这种情况下使用任播配置的好处是每台服务器都能够“吸收”一部分攻击，从而减轻服务器整体的压力。
- **负载均衡** Anycast技术可以将请求有效地控制在特定的网络区域内（一般是网络路径最短的节点优先被请求），Anycast往往和ECMP搭配使用，利用ECMP可以有效地负载均衡各个 DNS 服务器之间的查询；


## 3. Anycast 应用场景说明

AnyCast 主要应用于大范围的 DNS 部署、CDN 数据缓存、数据中心等。以一个案例需求说明：

某视频公司，BACKEND 服务集群在新加坡。该公司为降低资源成本不希望部署多套逻辑和数据层，但又希望全球客户能够流畅接入，这就需要全局漂移 IP 作为访问的唯一入口，并可做全局的就近分配、动态流量分配、故障剔除。

**方案设计说明**

<div  align="center">
	<img src="../assets/anycast-app.png" width = "350"  align=center />
</div>

方案重点如下：

**使用 Anycast 的 EIP (Anycast Elastic IP Address)，该 IP 同时在多地 Anycast，从而实现多地同服。**

后端集中维护一套集群，然后绑定 Anycast 类型的 EIP。该 EIP 借助云内网和 POP 点，多地发路由。
客户不用感知网络路径的选择，无需手动指定 IP 的发布位置，流量就近完成了全局负载均衡，从最优的地域进出，后端得到简化。同时，客户的 IP 得到收敛，无需每个地域配一个 IP 和 DNS 规则, 管理上得到简化, 同时传输质量得到提高。

**多个 IP 发布地，实现了多路径，增加了网络的容错能力**

此外，就近接入后走的是专线传输，比公网传输更可靠、更低延时，提升了用户的播放体验。

参考文档: 
- [CloudFlare Anycast介绍](https://www.cloudflare.com/learning/cdn/glossary/anycast-network)
- [阿里云Anycast实现多地同服](https://www.alibabacloud.com/help/zh/anycast-eip/latest/169284)
- [AWS Anycast实现全球加速](https://aws.amazon.com/cn/blogs/china/use-aws-global-accelerator-global-visit)
