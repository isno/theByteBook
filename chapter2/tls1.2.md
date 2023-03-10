# TLS/SSL 协议概述

TLS/SSL 协议位于应用层和传输层 TCP 协议之间。TLS 粗略的划分又可以分为 2 层：
- 靠近应用层的握手协议 TLS Handshaking Protocols
- 靠近 TCP 的记录层协议 TLS Record Protocol

TLS 握手协议还能细分为 5 个子协议：

- change_cipher_spec (在 TLS 1.3 中这个协议已经删除，为了兼容 TLS 老版本，可能还会存在)
- alert
- handshake
- application_data
- heartbeat (TLS 1.3 新加)

<div  align="center">
	<img src="/assets/chapter2/tls-protocl.png" width = "450"  align=center />
</div> 


### 一.TLS 记录层协议

记录层将上层的信息块分段为 TLSPlaintext 记录，TLSPlaintext 中包含 2^14 字节或更少字节块的数据。根据底层 ContentType 的不同，消息边界的处理方式也不同。TLS 1.3 中的规则比 TLS 1.2 中强制执行的规则更加严格。


握手消息可以合并为单个 TLSPlaintext 记录，或者在几个记录中分段，前提是：

- 握手消息不得与其他记录类型交错。也就是说，如果握手消息被分成两个或多个记录，则它们之间不能有任何其他记录。

- 握手消息绝不能跨越密钥更改。实现方必须验证密钥更改之前的所有消息是否与记录边界对齐; 如果没有，那么他们必须用 "unexpected_message" alert 消息终止连接。因为 ClientHello，EndOfEarlyData，ServerHello，Finished 和 KeyUpdate 消息可以在密钥更改之前立即发生，所以实现方必须将这些消息与记录边界对齐。


实现方绝不能发送握手类型的零长度片段，即使这些片段包含填充。

另外 Alert 消息禁止在记录之间进行分段，并且多条 alert 消息不得合并为单个 TLSPlaintext 记录。换句话说，具有 alert 类型的记录必须只包含一条消息。

应用数据消息包含对 TLS 不透明的数据。应用数据消息始终应该受到保护。可以发送应用数据的零长度片段，因为它们可能作为流量分析对策使用。应用数据片段可以拆分为多个记录，也可以合并为一个记录。

```
struct {
          ContentType type;
          ProtocolVersion legacy_record_version;
          uint16 length;
          opaque fragment[TLSPlaintext.length];
      } TLSPlaintext;

```

#### ContentType 用于处理 TLS 握手层的高级协议。
```
enum {
          invalid(0),
          change_cipher_spec(20),
          alert(21),
          handshake(22),
          application_data(23),
          heartbeat(24),  /* RFC 6520 */
          (255)
      } ContentType;

```
ContentType 是对握手协议的封装，消息头类型和握手层子协议编号的对应关系如下：

|消息头类型|ContentType|
|:---|:---|
|change_cipher_spec|0x014|
|alert|0x015|
|handshake|0x016|
|application_data|0x017|
|heartbeat(TLS1.3新增)|0x018|

#### legacy_record_version

对于除初始 ClientHello 之外的 TLS 1.3 实现生成的所有记录(即，在 HelloRetryRequest 之后未生成的记录)，必须将其设置为 0x0303，其中出于兼容性目的，它也可以是0x0301。该字段在 TLS 1.3 中已经弃用，必须忽略它。在某些情况下，以前版本的 TLS 将在此字段中使用其他值。

在 TLS 1.3 中，version 为 0x0304，过去版本与 version 的对应关系如下：

|协议版本|version|
|:---|:---|
|TLS 1.3|0x0304|
|TLS 1.2|0x0303|
|TLS 1.1|0x0302|
|TLS 1.0|0x0301|
|SSL 3.0|0x0300|

#### length

TLSPlaintext.fragment 的长度(以字节为单位)。长度不得超过 2 ^ 14 字节。接收超过此长度的记录的端点必须使用 "record_overflow" alert 消息终止连接。

#### fragment

正在传输的数据。此字段的值是透明的，它并被视为一个独立的块，由类型字段指定的更高级别协议处理。

当尚未使用密码保护时，TLSPlaintext结构是直接写入传输线路中的。一旦记录保护开始，TLSPlaintext 记录将受到密码保护。应用数据记录不得写入未受保护的连接中,所以在握手成功之前，是不能发送应用数据的。


TLS 记录层协议在整个 TLS 协议中的定位如下：

- 封装处理 TLS 上层(握手层)中的平行子协议(TLS 1.3 中是 5 个子协议，TLS 1.2 及更老的版本是 4 个子协议)，加上消息头，打包往下传递给 TCP 处理。
- 对上层应用数据协议进行密码保护，对其他的子协议只是简单封装(即不加密)

### TLS 密码切换协议

change_cipher_spec (以下简称 CCS 协议) 协议，是 TLS 记录层对应用数据是否进行加密的分界线。客户端或者服务端一旦收到对端发来的 CCS 协议，就表明接下来传输数据过程中可以对应用数据协议进行加密了。

TLS 记录层在处理上层 5 个协议(密码切换协议，警告协议，握手协议，心跳协议，应用数据协议)的时候，TLS 不同版本对不同协议加密的情况不同，具体情况如下：

|协议版本|密码切换协议|警告协议|握手协议|心跳协议|应用数据协议|
|:---|:---|:---|:---|:---|:---|
|TLS 1.3|无|✅ 部分加密|✅ 不分加密|❎||✅ |
|TLS 1.2|❎|❎|❎|无|✅ |

### TLS 警告协议

TLS 提供 alert 内容类型用来表示关闭信息和错误。与其他消息一样，alert 消息也会根据当前连接状态的进行加密。在 TLS 1.3 中，错误的严重性隐含在正在发送的警报类型中，并且可以安全地忽略 "level" 字段。"close_notify" alert 用于表示连接从一个方向开始有序的关闭。收到这样的警报后，TLS 实现方应该表明应用程序的数据结束。

收到错误警报后，TLS 实现方应该向应用程序表示出现了错误，并且不允许在连接上发送或接收任何其他数据。

```
 enum { warning(1), fatal(2), (255) } AlertLevel;
      
      struct {
          AlertLevel level;
          AlertDescription description;
      } Alert;
```
TLS 1.3 和 TLS 1.2 在这个协议上改动很小，只是新增加了几个枚举类型。

### TLS 握手协议

握手协议是整个 TLS 协议簇中最最核心的协议，HTTPS 能保证安全也是因为它的功劳。

握手协议由多个子消息构成，服务端和客户端第一次完成一次握手需要 2-RTT。

握手协议的目的是为了双方协商出密码块，这个密码块会交给 TLS 记录层进行密钥加密。也就是说握手协议达成的“共识”(密码块)是整个 TLS 和 HTTPS 安全的基础。

握手协议在 TLS 1.2 和 TLS 1.3 中发生了很大的变化。TLS 1.3 的 0-RTT 是一个全新的概念。两个版本在密钥协商上，密码套件选择上都有很大不同。

TLS 1.2 协议数据结构如下：

```
 enum {
       hello_request(0), 
       client_hello(1), 
       server_hello(2),
       certificate(11), 
       server_key_exchange (12),
       certificate_request(13), 
       server_hello_done(14),
       certificate_verify(15), 
       client_key_exchange(16),
       finished(20)
       (255)
   } HandshakeType;

   struct {
       HandshakeType msg_type;
       uint24 length;
       select (HandshakeType) {
           case hello_request:       HelloRequest;
           case client_hello:        ClientHello;
           case server_hello:        ServerHello;
           case certificate:         Certificate;
           case server_key_exchange: ServerKeyExchange;
           case certificate_request: CertificateRequest;
           case server_hello_done:   ServerHelloDone;
           case certificate_verify:  CertificateVerify;
           case client_key_exchange: ClientKeyExchange;
           case finished:            Finished;
       } body;
   } Handshake;
```

TLS 1.3 协议数据结构如下：

```
enum {
          hello_request_RESERVED(0),
          client_hello(1),
          server_hello(2),
          hello_verify_request_RESERVED(3),
          new_session_ticket(4),
          end_of_early_data(5),
          hello_retry_request_RESERVED(6),
          encrypted_extensions(8),
          certificate(11),
          server_key_exchange_RESERVED(12),
          certificate_request(13),
          server_hello_done_RESERVED(14),
          certificate_verify(15),
          client_key_exchange_RESERVED(16),
          finished(20),
          certificate_url_RESERVED(21),
          certificate_status_RESERVED(22),
          supplemental_data_RESERVED(23),
          key_update(24),
          message_hash(254),
          (255)
      } HandshakeType;

      struct {
          HandshakeType msg_type;    /* handshake type */
          uint24 length;             /* bytes in message */
          select (Handshake.msg_type) {
              case client_hello:          ClientHello;
              case server_hello:          ServerHello;
              case end_of_early_data:     EndOfEarlyData;
              case encrypted_extensions:  EncryptedExtensions;
              case certificate_request:   CertificateRequest;
              case certificate:           Certificate;
              case certificate_verify:    CertificateVerify;
              case finished:              Finished;
              case new_session_ticket:    NewSessionTicket;
              case key_update:            KeyUpdate;
          };
      } Handshake;
```

握手消息类型虽然有很多种，但是最终传到 TLS 记录层，有些会被合并到一条消息。

### TLS 应用数据协议

应用数据协议就是 TLS 上层的各种协议，TLS 主要保护的数据就是应用数据协议的数据。
TLS 记录层会根据加密模式的不同在应用数据的末尾加上 MAC 校验数据。

### TLS 心跳协议

这个协议是 TLS 1.3 新增的
```
 enum {
      heartbeat_request(1),
      heartbeat_response(2),
      (255)
   } HeartbeatMessageType;
   
   struct {
      HeartbeatMessageType type;
      uint16 payload_length;
      opaque payload[HeartbeatMessage.payload_length];
      opaque padding[padding_length];
   } HeartbeatMessage;
```

根据 [RFC6066] 中的定义，在协商的时候，HeartbeatMessage 的总长度不得超过 2 ^ 14 或 max_fragment_length。

HeartbeatMessage 的长度为 TLS 的TLSPlaintext.length 和 DTLS 的 DTLSPlaintext.length。此外，类型 type 字段的长度是 1 个字节，并且 payload_length 的长度是 2 个字节。因此，padding_length 是TLSPlaintext.length - payload_length - 3 用于 TLS，DTLSPlaintext.length - payload_length - 3 用于 DTLS。padding_length 必须至少为 16。

HeartbeatMessage 的发送方必须使用至少 16 个字节的随机填充。必须忽略收到的HeartbeatMessage 消息的填充。
