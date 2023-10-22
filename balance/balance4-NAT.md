# 4.3.1 直通模式负载均衡

NAT 模式的负载均衡器运维简单，只要机器将自己的网关地址设置为负载均衡器地址，就无需再设置其他信息，此模式请求到到响应的过程如图所示。

<div  align="center">
	<img src="../assets/balancer4-NAT.svg" width = "550"  align=center />
	<p>图4-2 NAT 模式负载均衡</p>
</div>

passthrough 模式