# 2.3 DNS 应用实践

2021年期间，互联网发生了几起影响颇大的服务宕机故障。2021年10月 Facebook 大面积瘫痪，facebook、instagram、whatsapp 等众多服务出现了长达接近 7 个小时宕机。Aakamai Edge DNS 故障，造成 PlayStation Network、HBO、UPS、Airbnb、Salesforce等服务约1个小时停摆。

这些故障是怎么引起的，故障影响范围为何如此广泛，带着这些问题，让我们开始 DNS 篇节。

## 1.DNS的工作原理

DNS（Domain Name System）是将域名转换为IP地址的系统。我们在浏览器输入一个域名时，DNS负责将该域名解析为相应的IP地址，以便后续与目标服务器建立TCP/IP连接。

要清楚DNS的工作原理，就必须了解域名是一个树状结构。最顶层的域名是根域名（root），然后是顶级域名（top-level domain，简写 TLD），再是一级域名、二级域名、三级域名，如图所示。

<div  align="center">
	<img src="../assets/dns-tree.webp" width = "350"  align=center />
	<p>图 3-2 DNS域名结构</p>
</div>

这种树状结构的意义在于，只有上级域名，才知道下一级域名的 IP 地址，需要逐级查询，每一级域名都有自己的 DNS 服务器，存放下级域名的 IP 地址。

了解域名的结构之后，我们看看域名时如何进行解析的，如下图所示。

<div  align="center">
	<img src="../assets/dns-example.png" width = "420"  align=center />
	<p>图 3-2 DNS 工作原理</p>
</div>


1. 用户向 `DNS 解析器`（如 Local DNS、代理用户 DNS 请求过程）发出解析 thebyte.com.cn 域名请求。
2. `DNS解析器` 判断是否存在解析缓存，如存在返回缓存结果。如无则向就近的 `Root nameserver` (根域名服务器)，请求所属 `TLD 域名服务器`。
3. 获取  com.cn.域的 `TLD 域名服务器`后， 向该地址请求 thebyte.com.cn. 的 `权威解析服务器`（Authoritative nameserver）。
4. 得到`权威解析服务器`后，向该服务请求域名对应的 IP 地址。 

从上面解析流程看出，有两个易出问题的环节，第一个是 Local DNS 出错，会产生局部用户无法访问服务，第二个是 Name Server 解析出现问题，会产生严重的整体服务不可用。一些重量级应用自建的 Name Server 宕机甚至会影响到整个互联网的稳定（如 facebook 挂掉，用户疯狂重试，引起公共 DNS 超负荷宕机，继而产生二次故障）。

## 3.域名故障排查

如果碰到网络故障、 DNS 解析错误时，第一步，我们可以用 nslookup 命令查询域名解析的基本信息，进行快速故障判断。

命令格式：nslookup domain [dns-server] ，解析示例：

```
$ nslookup thebyte.com.cn        
Server:		10.5.188.9
Address:	10.5.188.9#53

Non-authoritative answer:
Name:	thebyte.com.cn
Address: 110.40.229.45
```
返回信息说明

- 第一行的 Server 为负责此次解析 LocalDNS
- Non-authoritative answer 为缓存中获取域名解析结果。非实际存储 DNS Server中 域名解析，所以为非权威应答。
- Address 为域名所对应的IP，上面的解析可以看到是一个 A记录的 110.40.229.45

如果 nslookup 无法判断出结果，我们可以使用 dig 命令进一步查询，如指定 DNS 解析服务器等 (dig @1.1.1.1 thebyte.com.cn)。

```
$ dig thebyte.com.cn

; <<>> DiG 9.10.6 <<>> thebyte.com.cn
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 63697
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;thebyte.com.cn.			IN	A

;; ANSWER SECTION:
thebyte.com.cn.		599	IN	A	110.40.229.45

;; Query time: 14 msec
;; SERVER: 10.5.188.10#53(10.5.188.10)
;; WHEN: Fri May 12 15:22:33 CST 2023
;; MSG SIZE  rcvd: 59
```

dig 结果说明：

opcode：QUERY，表示执行查询操作，status：NOERROR，表示解析成功。

- **QUESTION SECTION部分** 展示发起的 DNS 请求参数，A 表示我们默认查询 A 类型记录。
- **ANSWER SECTION 部分** 为 DNS 查询结果。 thebyte.com.cn. 的解析结果为  110.40.229.45。

Facebook 2021年10月宕机故障中，使用 dig 排查各个公共DNS服务器，全部出现 SERVFAIL 错误，排查结果说明是 Facebook 内部的 Name Server 服务出现故障。

```
➜  ~ dig @1.1.1.1 facebook.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;facebook.com.            IN    A
➜  ~ dig @1.1.1.1 whatsapp.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;whatsapp.com.            IN    A
..
```