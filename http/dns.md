# 2.3 DNS 应用实践

2021年期间，互联网发生了几起影响颇大的服务宕机故障，7月23日 Aakamai Edge DNS 故障，造成 PlayStation Network、HBO、UPS、Airbnb、Salesforce等众多知名网站宕机，不久之后，10月4日 社交网络平台Facebook及旗下服务Messenger、Instagram、WhatsApp、Mapillary与Oculus发生全球性宕机。

这些故障是怎么引起的？影响范围为何如此广泛？带着这些问题，让我们开始 DNS 篇节。

## 2.3.1 DNS的工作原理

DNS（Domain Name System）是将域名转换为IP地址的系统。我们在浏览器输入一个域名时，DNS负责将该域名解析为相应的IP地址，以便后续与目标服务器建立TCP/IP连接。

要清楚DNS的工作原理，得先理解域名是一个树状结构。最顶层的域名是根域名（root），然后是顶级域名（top-level domain，简写 TLD），再是一级域名、二级域名、三级域名，如图2-2所示。

<div  align="center">
	<img src="../assets/dns-tree.webp" width = "350"  align=center />
	<p>图 2-2 DNS域名结构</p>
</div>

这种树状结构的意义在于只有上级域名才知道下一级域名的 IP 地址，获取一个域名IP时，需要逐级查询。每一级域名都有自己的DNS服务器存放下级域名的 IP 地址。

了解域名结构之后，我们再看看域名时如何进行解析，DNS解析流程如图2-3所示。

<div  align="center">
	<img src="../assets/dns-example.png" width = "420"  align=center />
	<p>图 2-3 DNS解析原理</p>
</div>


1. 用户向 `DNS 解析器`（也称为递归解析器，例如电信运营商的 114.114.114.114）发出解析 example.com 域名请求。
2. `DNS解析器` 判断是否存在解析缓存，如存在返回缓存结果。如无则就近向 `Root nameserver` (根域名服务器)请求所属 `TLD 域名服务器`。
3. 获取 com.域的 `TLD 域名服务器`后， 向该地址请求 example.com. 的 `权威解析服务器`（Authoritative nameserver）。
4. 得到`权威解析服务器`地址后，向该服务获取域名对应的 IP 地址，域名解析过程结束。 

DNS解析流程中有两个环节容易发生问题，一个是DNS解析器容易发布解析污染或者DNS解析器宕机，例如如企业内部自建DNS解析器，或者使用小运营商的解析器，这种情况会导致域名解析局部的不可用，另外一个是权威解析服务器出现故障，这种情况会导致全局域名解析不可用，但出现问题的概率极低。

下面我们继续看看如果DNS解析出现故障了该如何排查。

## 2.3.2 DNS故障排查

如果碰到服务不可用、Unknown host 等错误时，我们可以先用几个运维命令确认是否为DNS解析阶段出现问题。

### 1 使用nslookup命令

第一个介绍的是nslookup命令，该命令用于查询DNS的记录、域名解析是否正常。

nslookup命令示例。
```
$ nslookup thebyte.com.cn        
Server:		10.17.188.9
Address:	10.17.188.9#53

Non-authoritative answer:
Name:	thebyte.com.cn
Address: 110.40.229.45
```
返回信息说明。

- 第一行的 Server 为当前使用的DNS解析器（也可以指定解析器，例如 `nslookup thebyte.com.cn 8.8.8.8`）。
- Non-authoritative answer 因为DNS解析器只是转发权威解析服务器的记录，所以为非权威应答。
- Address 为解析结果，上面的解析可以看到是一个A记录 110.40.229.45。

### 2 使用dig命令

nslookup 返回的结果比较简单，如果想获取更多的信息，可以尝试使用 dig 命令。

dig命令示例。
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
;; SERVER: 10.17.188.10#53(10.17.188.10)
;; WHEN: Fri May 12 15:22:33 CST 2023
;; MSG SIZE  rcvd: 59
```

返回信息说明如下：

- opcode为QUERY，表示执行查询操作。status为NOERROR，表示解析成功。
- **QUESTION SECTION部分** 展示发起的 DNS 请求参数，A 表示我们默认查询 A 类型记录。
- **ANSWER SECTION 部分** 为 DNS 查询结果。thebyte.com.cn. 的解析结果为  110.40.229.45。

Facebook 2021年10月宕机故障中，使用 dig 排查各个公共DNS解析器，全部出现 SERVFAIL 错误，这说明是权威解析服务器出现了问题。
```
➜  ~ dig @1.1.1.1 facebook.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;facebook.com.            IN    A
➜  ~ dig @1.1.1.1 whatsapp.com
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 31322
;whatsapp.com.            IN    A
..
```