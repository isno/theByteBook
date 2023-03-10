# Apache APISIX

Apache APISIX 是 Apache 软件基金会下的云原生 API 网关，它兼具动态、实时、高性能等特点，提供了负载均衡、动态上游、灰度发布、服务熔断、身份认证、可观测性等丰富的流量管理功能。

与其他的API网关相比，APISIX的上游、路由、插件全都是动态，修改也不用重启，而且APISIX插件也是热加载，可以随时插拔、修改。APISIX使用Etcd存储，这使得APISIX可以轻松支持毫秒级配置更新、支撑数千网关节点，且网关节点无状态，可任意扩缩容。

我们可以使用 APISIX 来处理传统的南北向流量，也可以处理服务间的东西向流量。

同时，它也支持作为 K8s Ingress Controller 来使用。

## APISIX 应用

爱奇艺最初使用Kong作为网关的技术支撑，后续升级为APISIX，Kong和APISIX底层都是基于 OpenResty开发。

Kong和APISIX两者都是优秀的网关产品，两者在架构的设计上主要区别为：

- Apache APISIX 的路由是基数树， Kong 的路由实现是遍历的，会因 API 数量的增多而线性降低
- Kong 的存储是 postgres，需要节点去轮询，Apache APISIX 是 etcd 的 watch
- Kong 的 schema 校验是自己定义的标准，Apache APISIX 是 json schema
- 在单核的性能测试上，APISIX QPS约有18000，平均延迟 0.2ms， Kong则为 1700，平均延迟 2ms， 性能表现上 APISIX 更优秀

### 应用实践

APISIX 提供了强大的 Admin API 和 Dashboard 供用户使用。在一个大型的企业内，通常会有大量的项目、成员使用网关服务，借助 APISIX admin API。您稍微熟悉 Springboot + Vue，就可以快速开发出符合您企业需求的网关平台。

<div  align="center">
	<img src="/assets/chapter3/skywalker.png" width = "600"  align=center />
</div> 


在实现基础的网关服务之外，实现诸如 使用 Prometheus 插件实现报警，利用 Consul 打通 网关和 微服务平台的服务发现。通过多地部署，业务 CNAME 到统一网关方式直接为业务提供 就近接入、故障灾备切换、以及蓝绿部署和灰度发布等业务需求。

## APISIX 架构

<div  align="center">
	<img src="/assets/chapter3/apisix.webp" width = "550"  align=center />
</div> 


APISIX 采用了数据平面与控制平面分离的架构方式，通过配置中心接收、下发配置，使得数据平面不会受到控制平面影响。

在此架构中，数据平面负责接收并处理调用方请求，使用 Lua 与 Nginx 动态控制请求流量，可用于管理 API 请求的全生命周期。

控制平面则包含了 Manager API 和默认配置中心 etcd，可用于管理 API 网关。管理员在访问并操作控制台时，控制台将调用 Manager API 下发配置到 etcd，借助 etcd watch 机制，配置将在网关中实时生效。

配置中心默认为 etcd，也支持 Consul、Nacos、Eureka 等


