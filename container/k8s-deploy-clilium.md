# 使用 clilium 配置网络

cilium和其他的cni组件最大的不同在于其底层使用了ebpf技术，而该技术对于Linux的系统内核版本有较高的要求

cilium官方还给出了一份列表描述了各项高级功能对内核版本的要求：

|  特性 |  最低版本 |  
|---|---|
| Bandwidth Manager（带宽管理器）  | >= 5.1  |
|  Egress Gateway |   |
| VXLAN Tunnel Endpoint (VTEP) Integration  |   | 
|WireGuard Transparent Encryption||
|Full support for Session Affinity||
|BPF-based proxy redirection||
|Socket-level LB bypass in pod netns||
|L3 devices||
|BPF-based host routing||
|IPv6 BIG TCP support||
|IPv4 BIG TCP support||