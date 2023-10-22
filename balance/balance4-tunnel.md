# 隧道封装模式

与 NAT 不同，负载均衡器使用 GRE（Generic Routing Encapsulatio，通用路由封装）或 IPIP（IP in IP）隧道技术将 IP 包封装发送到后端。后端收到后进行解封装后可以拿到原始的 IP 包，里面有客户端的 IP 和 port 信息，因此后端可以直接将应答包发给客户端而不需要再经过 L4LB。
