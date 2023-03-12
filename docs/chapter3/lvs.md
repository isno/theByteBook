# 理解LVS

LVS是Linux Virtual Server的简写，意即Linux虚拟服务器，是一个虚拟的服务器集群系统 。主要是基于Netfilter实现的四层负载均衡集群系统，可在传输层将一组服务器构成一个实现可伸缩、高可用网络服务的虚拟服务群集。

LVS由两部分组成：ipvs和ipvsadm。 ipvs(ip virtual server)是Linux内核的一部分，实现传输层调度、转发等负载均衡的核心功能。ipvsadm是 ipvs在应用层的命令接口，负责为ipvs定义规则、集群服务等。


## LVS的一些概念性术语

LVS中有一些技术术语，如果没有释义，初看还有点迷糊。 比如爱奇艺内部的QLB服务，我知道是Qiyi Load Balancer才恍然大悟。

这些术语分为两个部分：Server相关和IP相关。

|缩写|全称|释义|
|:---|:---|:--|
|DS|Director Server |指的是前端负载均衡器节点，又称 Dispatcher、Balancer，主要接收用户请求|
|RS| Real Server |后端真实的工作服务器|

对Server的不同，角色的IP也有不同的术语

|缩写|全称|释义|
|:---|:---|:--|
|CIP|Client IP|用户客户端的IP|
|VIP|Virtual IP |LVS实例IP，一般是暴露在公网中的地址；向外部直接面向用户请求，作为用户请求的目标的IP地址|
|DIP| Director IP|主要用于和内部主机通讯的IP地址|
|RIP|Real IP |后端服务器的真实IP|

在后续的文章中涉及相关的技术，也将以上面的简写为代称。

## LVS的工作原理

由于Kubernetes里面的kube-proxy组件IPVS模式也被大量应用，笔者在这里花费一定的篇幅讲解LVS部分内部实现，以便加强在云原生章节的理解。 通过前面讲解Netfilter，也不难猜测出：LVS 主要通过向 Netfilter 的3个阶段注册钩子函数来对数据包进行处理，如下图

<div  align="center">
	<img src="/assets/chapter3/lvs-netfilter.png" width = "600"  align=center />
</div>

- 在 LOCAL_IN 阶段注册了 ip_vs_in() 钩子函数: 在路由判决之后，如果发现数据包是发送给本机的，那么就调用 ip_vs_in() 函数对数据包进行处理。
- 在 FORWARD 阶段注册了 ip_vs_out() 钩子函数: 在路由判决之后，如果发现数据包不是发送给本机的，调用 ip_vs_out() 函数对数据包进行处理。
- 在 POST_ROUTING 阶段注册了 ip_vs_post_routing() 钩子函数: 在发送数据前，需要调用 ip_vs_post_routing() 函数对数据包进行处理

在  LVS 的初始化函数 ip_vs_init() 可以找到这些钩子函数的注册代码，如下：

```
static struct nf_hook_ops ip_vs_in_ops = {    { NULL, NULL },    ip_vs_in, PF_INET, NF_IP_LOCAL_IN, 100};
static struct nf_hook_ops ip_vs_out_ops = {    { NULL, NULL },    ip_vs_out, PF_INET, NF_IP_FORWARD, 100};
static struct nf_hook_ops ip_vs_post_routing_ops = {    { NULL, NULL },    ip_vs_post_routing, PF_INET, NF_IP_POST_ROUTING, NF_IP_PRI_NAT_SRC-1};
static int __init ip_vs_init(void){    int ret;    ...    ret = nf_register_hook(&ip_vs_in_ops);
```

在介绍这些钩子函数之前，先来讲一下LVS 实现中几个对象：

- ip_vs_service：服务配置对象，主要用于保存 LVS 的配置信息，如支持的传输层协议、虚拟IP和端口等
- ip_vs_dest：真实服务器对象，主要用于保存真实服务器RS的配置，如真实IP、端口和权重等
- ip_vs_scheduler：调度器对象，主要通过使用不同的调度算法来选择合适的真实服务器对象
- ip_vs_conn： 连接对象，主要为了维护相同的客户端与真实服务器之间的连接关系。这是由于 TCP 协议是面向连接的，所以同一个的客户端每次选择真实服务器的时候必须保存一致，否则会出现连接中断的情况，而连接对象就是为了维护这种关系

这几个对象的关系如下：

<div  align="center">
	<img src="/assets/chapter3/ipvs2.png" width = "500"  align=center />
</div>


从上图可以看出，ip_vs_service 对象的 destinations 字段用于保存 ip_vs_dest 对象列表，而 scheduler 字段指向了一个 ip_vs_scheduler 对象。

ip_vs_scheduler 对象的 schedule 字段指向了一个调度算法函数，通过这个调度函数可以从 ip_vs_service 对象的 ip_vs_dest 对象列表中选择一个合适的真实服务器

ip_vs_service 对象和 ip_vs_dest 对象则通过用户配置创建 

如：

```
$ ipvsadm -A -t node1:80 -s wrrnode1 > 
$ ipvsadm -a -t node1:80 -r node2 -m -w 3node1 > 
$ ipvsadm -a -t node1:80 -r node3 -m -w 5

```

第一行用于创建一个 ip_vs_service 对象，而第二和第三行用于向 ip_vs_service 对象添加 ip_vs_dest 对象到 destinations 列表中。

上面的四个对象中，特别讲一下 ip_vs_conn，该对象用于维护 客户端 与 真实服务器 之间的关系

ip_vs_conn 的定义如下：
```
struct ip_vs_conn {
    struct list_head c_list; /* 用于连接到哈希表 */
    __u32 caddr; /* 客户端IP地址 */
    __u32 vaddr; /* 虚拟IP地址 */
    __u32 daddr; /* 真实服务器IP地址 */
    __u16 cport; /* 客户端端口 */
    __u16 vport; /* 虚拟端口 */
    __u16 dport; /* 真实服务器端口 */
    __u16 protocol; /* 协议类型（UPD/TCP） */ 
    ... 
    /* 用于发送数据包的接口 */ 
    int (*packet_xmit)(struct sk_buff *skb, struct ip_vs_conn *cp);
}
```
ip_vs_conn 对象各个字段的作用都在注释中进行说明了，客户端与真实服务器的连接关系就是通过 协议类型、客户端IP、客户端端口、虚拟IP 和 虚拟端口 来进行关联的，也就是说根据这五元组能够确定一个 ip_vs_conn 对象。

LVS 有3中运行模式：NAT模式、DR模式 和 TUN模式。而对于不同的运行模式，发送数据包的接口是不一样的，所以 ip_vs_conn 对象的 packet_xmit 字段会根据不同的运行模式来选择不同的发送数据包接口，绑定发送数据包接口是通过 ip_vs_bind_xmit() 函数完成，如下：

```
static inline void ip_vs_bind_xmit(struct ip_vs_conn *cp)
{
    switch (IP_VS_FWD_METHOD(cp)) {
    case IP_VS_CONN_F_MASQ:                     // NAT模式
        cp->packet_xmit = ip_vs_nat_xmit;
        break;
    case IP_VS_CONN_F_TUNNEL:                   // TUN模式
        cp->packet_xmit = ip_vs_tunnel_xmit;
        break;
    case IP_VS_CONN_F_DROUTE:                   // DR模式
        cp->packet_xmit = ip_vs_dr_xmit;
        break;
    ...
    }
}
```

一个客户端请求到达 LVS 后，Director服务器 首先会查找客户端是否已经与真实服务器建立了连接关系，如果已经建立了连接，那么直接使用这个连接关系。否则，通过调度器对象选择一台合适的真实服务器，然后创建客户端与真实服务器的连接关系，并且保存到全局哈希表 ip_vs_conn_tab 中。流程图如下

<div  align="center">
	<img src="/assets/chapter3/lvs1.png" width = "300"  align=center />
</div>

## LVS数据转发实现

作为一个负载均衡软件，其最重要的功能就是对数据的调度与转发，在本文笔者通过对IPVS NAT模式进行分析，以便读者更深入的了解LVS运行原理。

LVS中对数据的转发主要是通过 ip_vs_in() 和 ip_vs_out() 这两个钩子函数， ip_vs_in运行在 LOCAL_IN阶段，ip_vs_out运行在 FORWARD阶段。FORWARD 阶段发送在数据包不是发送给本机的情况，但是一般来说数据包都是发送给本机的，所以对于 ip_vs_out() 这个函数的实现就不作介绍，我们主要重点分析 ip_vs_in() 这个函数。

**ip_vs_in() 钩子函数**

通过前面的一些讲解铺垫，在这里对ip_vs_in() 函数分析就不那么困难了

```
static unsigned int
ip_vs_in(unsigned int hooknum,
         struct sk_buff **skb_p,
         const struct net_device *in,
         const struct net_device *out,
         int (*okfn)(struct sk_buff *))
{
    struct sk_buff *skb = *skb_p;
    struct iphdr *iph = skb->nh.iph; // IP头部
    union ip_vs_tphdr h;
    struct ip_vs_conn *cp;
    struct ip_vs_service *svc;
    int ihl;
    int ret;
    ...
    // 因为LVS只支持TCP和UDP
    if (iph->protocol != IPPROTO_TCP && iph->protocol != IPPROTO_UDP)
        return NF_ACCEPT;

    ihl = iph->ihl << 2; // IP头部长度

    // IP头部是否正确
    if (ip_vs_header_check(skb, iph->protocol, ihl) == -1)
        return NF_DROP;

    iph = skb->nh.iph;         // IP头部指针
    h.raw = (char*)iph + ihl;  // TCP/UDP头部指针
```

上面的代码主要对数据包的 IP头部 进行正确性验证，并且将 iph 变量指向 IP头部，而 h 变量指向 TCP/UDP 头部。

```
// 根据 "协议类型", "客户端IP", "客户端端口", "虚拟IP", "虚拟端口" 五元组获取连接对象
    cp = ip_vs_conn_in_get(iph->protocol, iph->saddr,
                           h.portp[0], iph->daddr, h.portp[1]);

    // 1. 如果连接还没建立
    // 2. 如果是TCP协议的话, 第一个包必须是syn包, 或者UDP协议。
    // 3. 根据协议、虚拟IP和虚拟端口查找服务对象
    if (!cp && 
        (h.th->syn || (iph->protocol != IPPROTO_TCP)) &&
        (svc = ip_vs_service_get(skb->nfmark, iph->protocol, iph->daddr, h.portp[1])))
    {
        ...
        // 通过调度器选择一个真实服务器
        // 并且创建一个新的连接对象, 建立真实服务器与客户端连接关系
        cp = ip_vs_schedule(svc, iph); 
        ...
    }

```
上面的代码主要完成以下几个功能：

- 根据 协议类型、客户端IP、客户端端口、虚拟IP 和 虚拟端口 五元组，然后调用 ip_vs_conn_in_get() 函数获取连接对象。
- 如果连接还没建立，那么就调用 ip_vs_schedule() 函数调度一台合适的真实服务器，然后创建一个连接对象，并且建立真实服务器与客户端之间的连接关系。

我们来分析一下 ip_vs_schedule() 函数的实现：

```
static struct ip_vs_conn *
ip_vs_schedule(struct ip_vs_service *svc, struct iphdr *iph)
{
    struct ip_vs_conn *cp = NULL;
    struct ip_vs_dest *dest;
    const __u16 *portp;
    ...
    portp = (__u16 *)&(((char *)iph)[iph->ihl*4]); // 指向TCP或者UDP头部
    ...
    dest = svc->scheduler->schedule(svc, iph); // 通过调度器选择一台合适的真实服务器
    ...
    cp = ip_vs_conn_new(iph->protocol,                      // 协议类型
                        iph->saddr,                         // 客户端IP
                        portp[0],                           // 客户端端口
                        iph->daddr,                         // 虚拟IP
                        portp[1],                           // 虚拟端口
                        dest->addr,                         // 真实服务器的IP
                        dest->port ? dest->port : portp[1], // 真实服务器的端口
                        0,                                  // flags
                        dest);
    ...
    return cp;
}
```

ip_vs_schedule() 函数的主要工作如下：

- 首先通过调用调度器（ip_vs_scheduler 对象）的 schedule() 方法从 ip_vs_service 对象的 destinations 链表中选择一台真实服务器（ip_vs_dest 对象）
- 然后调用 ip_vs_conn_new() 函数创建一个新的 ip_vs_conn 对象。

ip_vs_conn_new() 主要用于创建 ip_vs_conn 对象，并且根据 LVS 的运行模式为其选择正确的数据发送接口，其实现如下：

```
struct ip_vs_conn *
ip_vs_conn_new(int proto,                   // 协议类型
               __u32 caddr, __u16 cport,    // 客户端IP和端口
               __u32 vaddr, __u16 vport,    // 虚拟IP和端口
               __u32 daddr, __u16 dport,    // 真实服务器IP和端口
               unsigned flags, struct ip_vs_dest *dest)
{
    struct ip_vs_conn *cp;

    // 创建一个 ip_vs_conn 对象
    cp = kmem_cache_alloc(ip_vs_conn_cachep, GFP_ATOMIC); 
    ...
    // 设置 ip_vs_conn 对象的各个字段
    cp->protocol = proto;
    cp->caddr = caddr;
    cp->cport = cport;
    cp->vaddr = vaddr;
    cp->vport = vport;
    cp->daddr = daddr;
    cp->dport = dport;
    cp->flags = flags;
    ...
    ip_vs_bind_dest(cp, dest); // 将 ip_vs_conn 与真实服务器对象进行绑定
    ...
    ip_vs_bind_xmit(cp); // 绑定一个发送数据的接口
    ...
    ip_vs_conn_hash(cp); // 把 ip_vs_conn 对象添加到连接信息表中

    return cp;
}
```

ip_vs_conn_new() 函数的主要工作如下：

- 创建一个新的 ip_vs_conn 对象，并且设置其各个字段的值。
- 调用 ip_vs_bind_dest() 函数将 ip_vs_conn 对象与真实服务器对象（ip_vs_dest 对象）进行绑定。
- 根据 LVS 的运行模式，调用 ip_vs_bind_xmit() 函数为连接对象选择一个正确的数据发送接口，ip_vs_bind_xmit() 函数在前面已经介绍过。
- 调用 ip_vs_conn_hash() 函数把新创建的 ip_vs_conn 对象添加到全局连接信息哈希表中。

我们接着分析 ip_vs_in() 函数：

```
  if (cp->packet_xmit)
        ret = cp->packet_xmit(skb, cp); // 把数据包转发出去
    else {
        ret = NF_ACCEPT;
    }
    ...
    return ret;
}
```

ip_vs_in() 函数的最后部分就是通过调用数据发送接口把数据包转发出去，对于 NAT模式 来说，数据发送接口就是 ip_vs_nat_xmit()。

## 数据发送接口：ip_vs_nat_xmit()

接下来，我们对 NAT模式 的数据发送接口 ip_vs_nat_xmit() 进行分析。由于 ip_vs_nat_xmit() 函数的实现比较复杂，所以我们通过分段来分析：

```
static int ip_vs_nat_xmit(struct sk_buff *skb, struct ip_vs_conn *cp)
{
    struct rtable *rt;      /* Route to the other host */
    struct iphdr  *iph;
    union ip_vs_tphdr h;
    int ihl;
    unsigned short size;
    int mtu;
    ...
    iph = skb->nh.iph;                // IP头部
    ihl = iph->ihl << 2;              // IP头部长度
    h.raw = (char*) iph + ihl;        // 传输层头部(TCP/UDP)
    size = ntohs(iph->tot_len) - ihl; // 数据长度
    ...
    // 找到真实服务器IP的路由信息
    if (!(rt = __ip_vs_get_out_rt(cp, RT_TOS(iph->tos)))) 
        goto tx_error_icmp;
    ...
    // 替换新路由信息
    dst_release(skb->dst);
    skb->dst = &rt->u.dst;
```

上面的代码主要完成两个工作：

- 调用 __ip_vs_get_out_rt() 函数查找真实服务器 IP 对应的路由信息对象。
- 把数据包的旧路由信息替换成新的路由信息。

接着分析：

```
iph->daddr = cp->daddr; // 修改目标IP地址为真实服务器IP地址
    h.portp[1] = cp->dport; // 修改目标端口为真实服务器端口
    ...
    // 更新UDP/TCP头部的校验和
    if (!cp->app && (iph->protocol != IPPROTO_UDP || h.uh->check != 0)) {
        ip_vs_fast_check_update(&h, cp->vaddr, cp->daddr, cp->vport,
                                cp->dport, iph->protocol);

        if (skb->ip_summed == CHECKSUM_HW)
            skb->ip_summed = CHECKSUM_NONE;

    } else {
        switch (iph->protocol) {
        case IPPROTO_TCP:
            h.th->check = 0;
            h.th->check = csum_tcpudp_magic(iph->saddr, iph->daddr,
                                            size, iph->protocol,
                                            csum_partial(h.raw, size, 0));
            break;

        case IPPROTO_UDP:
            h.uh->check = 0;
            h.uh->check = csum_tcpudp_magic(iph->saddr, iph->daddr,
                                            size, iph->protocol,
                                            csum_partial(h.raw, size, 0));
            if (h.uh->check == 0)
                h.uh->check = 0xFFFF;
            break;
        }
        skb->ip_summed = CHECKSUM_UNNECESSARY;
    }
```

上面的代码完成两个工作：

- 修改目标IP地址和端口为真实服务器IP地址和端口。
- 更新 UDP/TCP 头部 的校验和（checksum）。

我们接着分析：

```
ip_send_check(iph); // 计算IP头部的校验和
    ...
    skb->nfcache |= NFC_IPVS_PROPERTY;
    ip_send(skb); // 把包发送出去
    ...
    return NF_STOLEN; // 让其他 Netfilter 的钩子函数放弃处理该包
}
```

上面的代码完成两个工作：

- 调用 ip_send_check() 函数重新计算数据包的 IP头部 校验和。
- 调用 ip_send() 函数把数据包发送出去。

这样，数据包的目标IP地址和端口被替换成真实服务器的IP地址和端口，然后被发送到真实服务器处。 

下面我们来总结一下整个流程：

当数据包进入到 Director服务器 后，会被 LOCAL_IN阶段 的 ip_vs_in() 钩子函数进行处理。ip_vs_in() 函数首先查找客户端与真实服务器的连接是否存在，如果存在就使用这个真实服务器。否则通过调度算法对象选择一台最合适的真实服务器，然后建立客户端与真实服务器的连接关系。

根据运行模式来选择发送数据的接口（如 NAT模式 对应的是 ip_vs_nat_xmit() 函数），然后把数据转发出去。

转发数据时，首先会根据真实服务器的IP地址更新数据包的路由信息，然后再更新各个协议头部的信息（如IP地址、端口和校验和等），然后把数据发送出去。

