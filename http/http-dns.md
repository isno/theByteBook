# 使用HTTP DNS

移动场景下DNS解析开销是整个网络请求中不可忽略的一部分。 在弱网环境中，基于 UDP的 LocalDNS解析非常容易出现解析超时的问题，这将直接影响客户端的用户体验。

## 域名信息查询

如果碰到网络故障、 DNS 解析错误时，第一步，我们可以用 nslookup 命令查询域名解析的基本信息。

命令格式：nslookup domain [dns-server] ，解析示例：

```
$ nslookup thebyte.com.cn        
Server:		10.5.188.9
Address:	10.5.188.9#53

Non-authoritative answer:
Name:	thebyte.com.cn
Address: 110.40.229.45
```

### 返回信息说明

- 第一行的Server 为负责此次解析的 LocalDNS
- Non-authoritative answer 为缓存中获取域名解析结果。非实际存储 DNS Server中 域名解析，所以为非权威应答
- Address 为域名所对应的IP，上面的解析可以看到是一个 A记录的 110.40.229.45