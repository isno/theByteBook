# HTTP/3的应用实践

爱奇艺曾对HTTP/3做过实验性的验证，现将验证数据分享出来

iOS系统支持
- 仅iOS14~ iOS15支持 H3-29草案
- iOS15及以上支持HTTP3协议

云控逻辑

- 命中HTTP3云控，根据系统能力走HTTP3或者H3-29
- 未命中HTTP3云控，根据请求策略走HTTP2或者http1.1

数据描述

- 数据时间范围为最近30天
- 数据过滤为iOS 14、15版本

协议的选择

如果命中便优先进行QUIC协议的请求，但不能保证一定会走到QUIC， 网络库内部会有一套竞速策略来择选最后的请求是HTTP还是QUIC

### 线上接口耗时表现

根据稳定的网络等级

<div  align="center">
	<img src="/assets/chapter2/quic-1.png" width = "650"  align=center />
</div> 

结论：HTTP3或 H3-29的相应速度更快 （耗时单位ms）

### 线上接口成功率表现

<div  align="center">
	<img src="/assets/chapter2/quic-3.png" width = "650"  align=center />
</div> 

结论：HTTP3或 H3-29的失败率更高

客户端网络质量分布

<div  align="center">
	<img src="/assets/chapter2/quic-4.png" width = "450"  align=center />
</div> 

97%的网络质量 处于良好以上的等级