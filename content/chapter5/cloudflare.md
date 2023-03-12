# Cloudflare 2022年6月故障总结

又一个 BGP 配错导致的全球互联网故障!。

2022 年 6 月 21 日，Cloudflare 发生了一次服务故障事件，影响到Cloudflare 19 个数据中心的流量。

不幸的是，这 19 个数据中心处理的流量在Cloudflare全球流量中占较大比例，这也意味着，全球绝大部分使用Cloudflare的用户都会收到影响。

## 故障现象

由于 Cloudflare 是全球使用最广泛的 CDN服务商，为 2600 万网站提供CDN等服务，这次故障基本切断了全球互联网50%的流量，故障导致包括Discord,、Shopify、Grindr、Fitbit 和 Peleton 等众多海外知名互联网应用受到影响，多家加密货币交易所包括 Coinbase、Bitfinex、火币、Gate.io、Coinhaco、FTX 等也出现访问异常。

另外对于使用 Cloudflare 的 DNS lookup 服务的用户来说，由于使用 Cloudflare 的 1.1.1.1 DNS 服务，在中断期间根本无法访问任何网站。

## 故障的原因

根据 Cloudflare 官方的说法，Cloudflare内部正在进行一个 Multi-Colo PoP（MCP）架构的调整，

MCP一个关键部分是 Clos 网络 （一种多级的交换架构）用于方便网络链接，这种网络连接让Cloudflare能轻松地禁用和启用数据中心内部网络的某些部分，以便进行修复或者处理某个问题。

<div  align="center">
	<img src="/assets/chapter5/cf-4.png" width = "450"  align=center />
</div>

这些策略由互相独立的单元构成，它们会被按照顺序进行独立评估。最终结果是，任何特定的前缀要么被广播，要么不被广播。策略的变化可能意味着以前广播的前缀不再被广播，在这种情况下，该前缀会被撤销，这些 IP 地址在互联网上将不可再访问。

<div  align="center">
	<img src="/assets/chapter5/cf-5.png" width = "450"  align=center />
</div>


在部署前缀广播策略更改时，一个配置语句的顺序调整导致我们撤销了一个关键的前缀子集。

由于这一个撤销动作，Cloudflare 的工程师在连接到站点想要恢复问题时遭遇了额外的困难。我们有处理此类事件的备份程序，并使用它们来接管了受影响的数据中心。

- 03:56：我们开始在第一个数据中心部署策略变更。这些数据中心都没有受到变更的影响，因为这些数据中心都在使用我们老架构。
- 06:17：在我们一些最忙碌的数据中心开始部署策略变更，但这些数据中心也并非使用这个最新架构。
- 06:27：策略变更开始部署到我们的 MCP 架构的数据中心，且已经更改了其中的网络骨干连接。服务故障开始，随即导致这 19 个数据中心下线。
- 06:32：Cloudflare 内部正式发布这个事件。
- 06:51：开始对一个路由器进行配置更改，以验证故障根本原因。
- 06:58：故障根本原因确认。开始部署恢复配置。
- 07:42：最后一个还原操作完成。由于网络工程师进行更改时发生重叠，还原了之前的还原，导致问题偶尔再次出现，完成时间被推迟。
- 09:00：故障事件关闭

我们从全球返回的成功请求数量可以明显看出这些数据中心的重要性：

<div  align="center">
	<img src="/assets/chapter5/cf-1.png" width = "450"  align=center />
</div>

尽管这些数据中心仅占我们网络的一小部分（4%），但我们总请求数的 50% 受到了影响。出口带宽中也可以看到同样的情况：

<div  align="center">
	<img src="/assets/chapter5/cf-2.png" width = "450"  align=center />
</div>

## 这次事件技术描述及其发生过程

作为标准化 Cloudflare 基础设施的一部分，我们开始标准化 Cloudflare 宣告的前缀BGP community 属性。具体来说，我们为 site-local 前缀添加了信息 community 属性。这些前缀允许我们的计算节点彼此通信，并连接到客户源站。作为 Cloudflare 配置变更的一部分，一个更改请求（CR）工单被生成，其中包括更改的试运行，以及一个分步骤部署过程。在被允许发布之前，它也经过了多位同级工程师的互相评估。不幸的是，在这种情况下，这些配置变更检查步骤没有能够在配置更改我们的骨干网络之前发现错误。

在其中一个路由器上的配置变更类似这样：

```
[edit policy-options policy-statement 4-COGENT-TRANSIT-OUT term ADV-SITELOCAL then]
+      community add STATIC-ROUTE;
+      community add SITE-LOCAL-ROUTE;
+      community add TLL01;
+      community add EUROPE;
[edit policy-options policy-statement 4-PUBLIC-PEER-ANYCAST-OUT term ADV-SITELOCAL then]
+      community add STATIC-ROUTE;
+      community add SITE-LOCAL-ROUTE;
+      community add TLL01;
+      community add EUROPE;
[edit policy-options policy-statement 6-COGENT-TRANSIT-OUT term ADV-SITELOCAL then]
+      community add STATIC-ROUTE;
+      community add SITE-LOCAL-ROUTE;
+      community add TLL01;
+      community add EUROPE;
[edit policy-options policy-statement 6-PUBLIC-PEER-ANYCAST-OUT term ADV-SITELOCAL then]
+      community add STATIC-ROUTE;
+      community add SITE-LOCAL-ROUTE;
+      community add TLL01;
+      community add EUROPE;
```
这是没有配置错误的，仅仅向这些前缀广播添加了一些额外的信息。对骨干网络连接的更改如下：

```
[edit policy-options policy-statement AGGREGATES-OUT]
term 6-DISABLED_PREFIXES { ... }
!    term 6-ADV-TRAFFIC-PREDICTOR { ... }
!    term 4-ADV-TRAFFIC-PREDICTOR { ... }
!    term ADV-FREE { ... }
!    term ADV-PRO { ... }
!    term ADV-BIZ { ... }
!    term ADV-ENT { ... }
!    term ADV-DNS { ... }
!    term REJECT-THE-REST { ... }
!    term 4-ADV-SITE-LOCALS { ... }
!    term 6-ADV-SITE-LOCALS { ... }
[edit policy-options policy-statement AGGREGATES-OUT term 4-ADV-SITE-LOCALS then]
community delete NO-EXPORT { ... }
+      community add STATIC-ROUTE;
+      community add SITE-LOCAL-ROUTE;
+      community add AMS07;
+      community add EUROPE;
[edit policy-options policy-statement AGGREGATES-OUT term 6-ADV-SITE-LOCALS then]
community delete NO-EXPORT { ... }
+      community add STATIC-ROUTE;
+      community add SITE-LOCAL-ROUTE;
+      community add AMS07;
+      community add EUROPE;

```

乍一看，这个配置好像完全相同，但不幸的是，实际并非如此。如果我们重点关注 以下部分，原因就很清楚了：

```
!    term REJECT-THE-REST { ... }
!    term 4-ADV-SITE-LOCALS { ... }
!    term 6-ADV-SITE-LOCALS { ... }
```

在这部分配置中，term 前的感叹号表示 term 的重新排序。在这种情况下，多个 term 上移，两个术语被添加到底部。具体而言，4-ADV-SITE-LOCALS term 被从顶部移到底部。这个 term 现在处于 REJECT-THE-REST term 之后。顾名思义，这个 term 是一种显式拒绝：


```
term REJECT-THE-REST {
    then reject;
} 
```

由于该 term 现在处于 site-local term 之前，我们立即停止广播了 site-local 前缀，在瞬间切断了我们对所有受影响数据中心的直接访问，并导致我们的服务器无法到达源。

除此之外，这些 site-local 前缀被移除也导致我们的内部负载平衡性系统 Multimog（我们 Unimog 负载平衡器的一个变体）停止工作，因为它不能在我们的 MCP 中的服务器之间转发请求。这意味着 MCP 中较小的计算集群接收到的流量与最大的集群相同，导致较小的集群过载。

<div  align="center">
	<img src="/assets/chapter5/cf-3.png" width = "450"  align=center />
</div>


## 补救及后续步骤

**过程**：虽然 MCP 项目旨在提高可用性，但我们更新这些数据中心的程序上存在缺陷，最终导致 MCP 数据中心以外更广泛的影响。虽然我们采用了一个交叉排错程序来实施配置变更，但交叉排错程序直到最后一步才将 MCP 数据中心包括在内。更改程序和自动化需要包括 MCP 特定的测试和部署程序，以确保不出现意外后果。

**架构**：不正确的路由器配置阻止了适当的路由被公告到我们的边缘，阻止了流量正确地流向我们的基础设施。最终，导致问题产生的路由宣告机制将被重新设计，以防止无意的错误路由宣告排序问题。

**自动化**：在我们的自动化套件中有几个机会可以减轻此事件的部分或全部影响。首先，我们会集中精力进行自动化改进，这将是一种交错式的网络配置策略，并可以提供 “提交—确认” 的配置回滚机制。前一种将大大降低事故产生的整体影响，后一种将大大降低事件的解决时间。

