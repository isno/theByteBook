# 2.3.4 使用 HTTPDNS 解决中间商问题

解决 Authoritative nameserver 可用性之后，再回过头看看 Recursive resolver 的问题。

Recursive resolver 是 DNS 查询中的第一站，它作为客户端与 DNS 域名服务器的中间人帮我们去整棵 DNS 树上进行解析，然后将解析的结果返回给客户端。

但作为一个「中间商」，Recursive resolver 往往有自己的「小心思」。一个最令人头痛的问题就是域名劫持，其他还存在延迟、调度不精准等问题。诸多问题与挑战本质根源在于 **Recursive resolver 服务经历了过多的中间环节，服务不可控**。

如果能绕过中间环节，设计一个更安全、直接、高效的 Recursive resolver，上述问题看起来就可以彻底地得到解决。HTTPDNS 模式在这样的背景下应运而生。

HTTPDNS 系统跳过系统默认的 DNS 解析的过程，使用 HTTPS 协议绕过运营商的 Recursive resolver 请求更可靠的自建服务。从而避免域名劫持，更准确地判断客户端地区和运营商，得到更精准的解析结果。

<div  align="center">
	<img src="../assets/httpdns.png" width = "520"  align=center />
	<p>图2-8 HTTPDNS 模式下 DNS 解析流程</p>
</div>

使用 HTTPDNS ，辅以客户端预解析、懒加载等策略，能明改善传统域名带来的各类解析问题。笔者的实践中，使用 HTTPDNS 服务，全球各个服务初次请求延迟约下降 25% 左右，之前头疼的劫持、页面无法打开故障也大幅下降。
