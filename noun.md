# 术语缩写释义

本书各个篇章出现了较多的术语缩写，初次引用时会注明释义。但为了查阅方便，笔者按分类整理成以下表格。

:::center
表 1 网络类
:::
|术语|名词全称|释义|
|:--|:--|:--|
| AS | Autonomous System | 网络自治系统 |
| CIDR | Classless Inter-Domain Routing | 无类域间路由 |
| VPC | Virtual Private Cloud | 私有网络 |
| VIP | Virtual IP address | 虚拟 IP 地址 |
| SDN | Software Defined Networking | 软件定义网络 |
| (S)LB | (Server) Load Balancer | 负载均衡 |
| NIC | Network Interface Card | 网卡 |
| RTT | Round-Trip Time | 往返时延 |
| NAT | Network Address Translation | 网络地址转换 |
| TTFB | Time To First Byte | 首字节时间 |
| BBR | Bottleneck Bandwidth and RTT | Google 推出的拥塞控制算法 |
|PPS|Packet Per Second | 包 / 秒，表示以网络包为单位的传输速率 |
| BDP | Bandwidth-Delay Product | 带宽时延积 |
|RDMA| Remote Direct Memeory Access | 远程内容直接读取|
| 南北流量 | NORTH-SOUTH traffic | 用户访问服务器的流量 |
| 东西流量 | EAST-WEST traffic | 集群中服务与服务之间的流量 |

:::center
表 2 云技术类
:::
|术语|名词全称|释义|
|:--|:--|:--|
| IaaS | Infrastructure as a Service | 基础设施即服务 |
| PaaS | Platform  as a Service | 平台即服务 |
| SaaS | Software as a Service | 软件即服务 |
| FaaS | Function as a Service | 功能即服务 |
| CaaS | Container as a Service | 容器即服务 |
| IaC | Infrastructure as Code | 基础设施即代码 |
| KVM | Kernel-based Virtual Machine | 基于内核的虚拟机 |
| AZ | Availability Zone | 可用区 |
| SRE|  Site Reliability Engineering | 站点可靠性工程 |
| CE | Chaos Engineering（混沌工程）| 故障演练及解决。研究大规模分布式系统瓶颈、缺陷，提升整体服务稳定的方法学|
| DevOps|  Development + Operations | 开发运维 |
| AIDevOps|  AI + Development + Operations | 智能开发运维 |
| DevSecOps | Development + Security + Operations | 开发、安全和运维，应用安全 (AppSec) 领域术语 |
| CI/CD|  Continuous Integration + Continuous Deployment | 持续集成 + 持续交付 |

:::center
表 3 Kubernetes 相关类
:::
|术语|名词全称|释义|
|:--|:--|:--|
| CNCF | Cloud Native Computing Foundation | 云原生计算基金会 |
| OCI | Open Container Initiative | Linux 基金主导的开放容器标准 |
| CRI | Container Runtime Interface | Kubernetes 定义的容器运行时接口 |
| CNI | Container Network Interface | Kubernetes 定义的容器网络接口 |
| CRD | Custom Resource Definition | 自定义资源的定义，用来扩展 Kubernetes 资源 |
| Operator | CRD + AdmissionWebhook + Controller | 用来解决某个应用场景的 Kubernetes 扩展 |

:::center
表 4 业务类
:::
|术语|名词全称|释义|
|:--|:--|:--|
| QPS | Queries Per Second | 每秒请求数 |
| QoS | Quality of Service | 服务质量 |
| TPS | Transactions Per Second | 每秒事务数  |
| MTBF | Mean Time Between Failure | 平均故障间隔时长  |
| P90 | percentile 90  | 数据聚合统计方式，用来衡量业务指标 |
| QA | Quality Assurance | 品质保证|
| SLA | Service Level Agreement | 服务等级协议，用于向客户承诺提供的服务等级 | 
| APM | Application Performance Monitoring | 应用程序性能监控|

