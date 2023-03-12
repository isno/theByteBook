# iptables示例

在RHEL7+中，系统默认启用了firewalld防护墙，firewalld和iptables都是基于netfilter，底层命令都是基于iptables。
不过firewalld相对iptables可以动态修改规则，不必全部刷新才能生效。

现提供部分iptables命令，以供参考。

查看规则列表
```
iptables -nvL
```

允许22端口

```
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

允许来自192.168.0.4的包
```
iptables -A INPUT -s 192.168.0.4 -j ACCEPT
```


允许现有连接或与现有连接关联的包
```
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
```
禁止所有其他包
```
iptables -P INPUT DROP
iptables -P FORWARD DROP

```
MASQUERADE
```
iptables -t nat -I POSTROUTING -s 10.0.0.30/32 -j MASQUERADE
```
NAT
```
iptables -I FORWARD -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -I INPUT   -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -t nat -I OUTPUT -d 55.55.55.55/32 -j DNAT --to-destination 10.0.0.30
iptables -t nat -I PREROUTING -d 55.55.55.55/32 -j DNAT --to-destination 10.0.0.30
iptables -t nat -I POSTROUTING -s 10.0.0.30/32 -j SNAT --to-source 55.55.55.55
```

端口映射
```
iptables -t nat -I OUTPUT -d 55.55.55.55/32 -p tcp -m tcp --dport 80 -j DNAT --to-destination 10.10.10.3:80
iptables -t nat -I POSTROUTING -m conntrack ! --ctstate DNAT -j ACCEPT
iptables -t nat -I PREROUTING -d 55.55.55.55/32 -p tcp -m tcp --dport 80 -j DNAT --to-destination 10.10.10.3:80
```
重置所有规则
```
iptables -F
iptables -t nat -F
iptables -t mangle -F
iptables -X

```