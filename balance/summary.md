# 第四章：负载均衡技术概论

:::tip <a/>
当你试图解释一条命令、一个语言特性或是一种硬件的时候，请首先说明它要解决的问题。

:::right 
—— 摘自《编程珠玑》[^1]
:::

负载均衡是构建可靠分布式系统最核心的概念之一。

以四层负载均衡（譬如 LVS、DPVS）为核心的网络边缘，再到以七层负载均衡（譬如 OpenResty、Kong、APISIX 等）为核心的网关，再到集群内部的各类的分布式框架，譬如 SpringCloud 的 Ribbon 等等。负载均衡的影响在分布式系统中随处可见。



不过无论负载均衡器以何种形式存在，核心的职责都是「**选择谁来处理用户请求**」和「**将用户请求转发过去**」，本章我们把握这两个核心职责去分析负载均衡技术。

<div  align="center">
	<img src="../assets/balance-summary.png" width = "500"  align=center />
	<p>图 4-0 本章内容导读 </p>
</div>


[^1]:《编程珠玑》作者是 Jon Bentley，被誉为影响算法发展的十位大师之一。在卡内基-梅隆大学担任教授期间，他培养了包括 Tcl 语言设计者 John Ousterhout、Java 语言设计者 James Gosling、《算法导论》作者之一Charles Leiserson 在内的许多计算机科学大家。