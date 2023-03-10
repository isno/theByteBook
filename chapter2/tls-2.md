# TLS 记录层协议

TLS 记录协议是一个层次化的协议。在每一层中，消息都可能包含长度、描述、内容等字段。记录协议主要功能包括装载了被发送的消息，将数据分片为可管理的块，有选择地压缩数据，应用 MAC，加密，传输最终数据。接收到的数据被解密，验证，解压缩，重组，然后传递给高层应用。

### TLS 记录层的连接状态

一个 TLS 连接的状态就是 TLS 记录协议的操作环境。它指定了一个压缩算法，一个加密算法，一个 MAC 算法。此外，这些算法的参数必须是已知的：用于 connection 连接的读、写两个方向的 MAC 密钥和块加密密钥。

逻辑上总是有4个状态比较突出：可读和可写状态，挂起的读和写状态。所有的记录协议都在可读写状态下处理。挂起状态的安全参数可以通过 TLS 握手协议来设置，而 ChangeCipherSpec 可以有选择地设置当前状态为挂起状态，在这种情况下适当的当前状态被设置，并被挂起状态所替代; 挂起状态随后会被重新初始化为一个空状态。将一个状态未经安全参数的初始化就设置为一个当前状态是非法的。初始当前状态一直会指定不使用加密，压缩或 MAC。


简单来说，Client 和 Server 在建立链接之前都处于：

```
 pending read status 待读状态
 pending write status 待写状态
```

一旦接收到对端的 ChangeCipherSpec 消息以后，Client 和 Server 就会开始转换为：
```
current read status 可读状态
current write status 可写状态
```

在收到对端的 ChangeCipherSpec 之前，所有的 TLS 握手消息都是明文处理的，没有安全性和完整性的保护。一旦所有的加密参数都准备好，就会转换成可读可写状态，进入到了可读可写状态以后就会开始加密和完整性保护了。

一个 TLS 连接读写状态的安全参数可以通过提供如下值来设定：

```
enum { server, client } ConnectionEnd;
```

**连接终端:**

在这个连接中这个实体被认为是 "client" 或 "server"。

```
enum { tls_prf_sha256 } PRFAlgorithm;
```
**PRF 算法**

被用于从主密钥生成密钥的算法。在 TLS 1.2 中 PRF 默认使用加密基元是 SHA256 算法。在 TLS 1.2 握手协议中，需要通过该函数将预备主密钥转换为主密钥，主密钥转换为密钥块。

```
enum { null, rc4, 3des, aes } BulkCipherAlgorithm;        
enum { stream, block, aead } CipherType;
```

**块加密算法**

被用于块加密的算法。它包含了这种算法的密钥长度，它是成块加密，流加密，或 AEAD 加密，密文的块大小(如果合适的话)，和显示和隐式初始化向量(或 nonces)的长度。

```
enum { null, hmac_md5, hmac_sha1, hmac_sha256, hmac_sha384, hmac_sha512} MACAlgorithm;
```
**MAC 算法:**

被用于消息验证的算法。包含了 MAC 算法返回值的长度。
```
 enum { null(0), (255) } CompressionMethod;
      
      /* CompressionMethod, PRFAlgorithm,
         BulkCipherAlgorithm, 和 MACAlgorithm 指定的算法可以增加 */   
```

**压缩算法:**
用于数据压缩的算法。被规范必须包含算法执行压缩所需的所有信息。

**主密钥:**

在连接的两端之间共享的 48 字节密钥。

**客户端随机数:**

由客户端提供的 32 字节随机数。

**服务器随机数:**
由服务器提供的 32 字节随机数。

根据上面这些参数，我们得到，安全参数的数据结构，如下：

```
 struct {
          ConnectionEnd          entity;
          PRFAlgorithm           prf_algorithm;
          BulkCipherAlgorithm    bulk_cipher_algorithm;
          CipherType             cipher_type;
          uint8                  enc_key_length;
          uint8                  block_length;
          uint8                  fixed_iv_length;
          uint8                  record_iv_length;
          MACAlgorithm           mac_algorithm;  /*mac 算法*/
          uint8                  mac_length;     /*mac 值的长度*/
          uint8                  mac_key_length; /*mac 算法密钥的长度*/
          CompressionMethod      compression_algorithm;
          opaque                 master_secret[48];
          opaque                 client_random[32];
          opaque                 server_random[32];
      } SecurityParameters;
```

TLS 握手协议会填充好上述的加密参数，然后 TLS 记录层会使用安全参数产生如下的 6 个条目(其中的一些并不是所有算法都需要的，因此会留空):

```
client write MAC key
      server write MAC key
      client write encryption key
      server write encryption key
      client write IV
      server write IV
```

这里是 2 套 MAC 密钥，加密密钥和初始化向量。原因是因为 Client 和 Server 通信的双方分别维护着自己的安全参数 SecurityParameters。

当 Server 接收并处理记录时会使用 Client 写参数，反之亦然。例如：Client 使用 client write MAC key、client write encryption key、client write IV 密钥块加密消息，Server 接收到以后，也需要使用 Client 的 client write MAC key、client write encryption key、client write IV 的密钥快进行解密。

一旦安全参数被设定且密钥被生成，连接状态就可以将它们设置为当前状态来进行初始化。这些当前状态必须在处理每一条记录后更新。每个连接状态包含如下元素：

**压缩状态：**
压缩算法的当前状态。一般不启用压缩，压缩可能会导致安全问题，具体问题在 TLS 安全的那篇文章里面再仔细分析。

**密钥状态：**
加密算法的当前状态，即每个连接使用的加密算法和加密算法使用的密钥块。这个状态由连接的预定密钥组成。对于流密码，这个状态也将包含对流数据进行加解密所需的任何必要的状态信息。

**MAC 密钥：**
当前连接的 MAC 密钥。

**序列号：**
每个连接状态包含一个序列号，读状态和写状态分别维持一个序列号。当一个连接的状态被激活时序列号必须设置为 0。序列号的类型是 uint64，所以序列号大小不会超过 2^64-1。序列号不能 warp。如果一个 TLS 实现需要 warp 序列号，则必须重新协商。一个序列号在每条记录信息被发送之后自动增加。特别地，在一个特殊连接状态下发送的第一条记录消息必须使用序列号 0。序列号本身是不包含在 TLS 记录层协议消息中的。


### 二. TLS 记录层协议的处理步骤
TLS 记录层协议处理上层传来的消息，处理步骤主要分为 4 步：

- 数据分块
- 数据压缩/数据填充(在 TLS 1.2 中是数据压缩，在 TLS 1.3 中是数据填充，数据压缩和填充这一步都是可选的)
- 加密和完整性保护(在 TLS 1.2 中主要分三种模式：流加密模式、分组模式、AEAD 模式，在 TLS 1.3 中只有 AEAD 模式)
- 添加消息头

#### 数据分块

(1) TLS1.2

记录层将信息块分段为以 2^14 字节或更小的块存储数据的 TLSPlaintext。TLSPlaintext 就是 TLS 记录层分块后的数据结构。Client 信息边界并不在记录层保留(即，多个同一内容类型的 Client 信息会被合并成一个 TLSPlaintext，或者一个消息会被分片为多个记录)。

```
struct {
          uint8 major;
          uint8 minor;
      } ProtocolVersion;

      enum {
          change_cipher_spec(20), 
          alert(21), 
          handshake(22),
          application_data(23), 
          (255)
      } ContentType;

      struct {
          ContentType type;
          ProtocolVersion version;
          uint16 length;
          opaque fragment[TLSPlaintext.length];
      } TLSPlaintext;
```
**type**
用于处理封装的分片的高层协议类型。

**version**

协议的版本。TLS 1.2 的版本是{3,3}。版本值 3.3 是基于历史的，因为 TLS 1.0 使用的是{3,1}。需要注意的是一个支持多个版本 TLS 的 Client 在收到 ServerHello 之前可能并不知道最终版本是什么。

**length**

TLSPlaintext.fragment 的长度(以字节计)。这个长度不能超过 2^14.

**fragment**

应用数据。这种数据是透明的并且作为一个独立的块由 type 域所指定的高层协议来处理。

实现上不能发送 fragments 长度为 0 的握手，alert 警报，或 ChangeCipherSpec 内容类型。发送 fragment 长度为 0 的应用数据在进行流量分析时是有用的。

注意：不同 TLS 记录层内容类型的数据可能是交错的。应用数据的传输优先级通常低于其它内容类型。然而, 记录必须以记录层能提供保护的顺序传递到网络中。接收者必须接收并处理一条连接中在第一个握手报文之后交错的应用层流量。

相同协议的多个子消息，是可以合并到一个 TLS 记录层协议的数据结构中，例如握手协议中的多个子消息，type 都是 handshake，只不过是数据段长度不同，但是数据结构都可以是 TLSPlaintext。

(2) TLS1.3

在 TLS 1.2 规范中，高层协议有 4 个，分别是 change_cipher_spec、alert、handshake、application_data。在 TLS 1.3 规范中高层协议也有 4 个，分别是 alert、handshake、application_data，heartbeat。

```
struct {
          ContentType type;
          ProtocolVersion legacy_record_version;
          uint16 length;
          opaque fragment[TLSPlaintext.length];
      } TLSPlaintext;
```
TLSPlaintext 数据结构在 TLS 1.3 中没有发生变化，字段的含义也是完全一致的。不过字段的值新增了几个。

ContentType 在 TLS 1.3 中新增加了 heartbeat(24) 类型。
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

ProtocolVersion 是为了兼容 TLS 1.3 之前的版本，该字段在 TLS 1.3 中已经被废弃了。

TLS 1.3 中，相同协议的多个子消息也可以合并成单个 TLSPlaintext，不过 TLS 1.3 中的规则比 TLS 1.2 中强制执行的规则更加严格。例如：握手消息可以合并为单个 TLSPlaintext 记录，或者在几个记录中分段，前提是：

- 握手消息不得与其他记录类型交错。也就是说，如果握手消息被分成两个或多个记录，则它们之间不能有任何其他记录。

- 握手消息绝不能跨越密钥更改。实现方必须验证密钥更改之前的所有消息是否与记录边界对齐; 如果没有，那么他们必须用 "unexpected_message" alert 消息终止连接。因为 ClientHello，EndOfEarlyData，ServerHello，Finished 和 KeyUpdate 消息可以在密钥更改之前立即发生，所以实现方必须将这些消息与记录边界对齐。

- 另外在 TLS 1.3 中 Alert 消息禁止在记录之间进行分段，并且多条 alert 消息不得合并为单个 TLSPlaintext 记录。换句话说，具有 alert 类型的记录必须只包含一条消息。

以上是 TLS 1.3 和 TLS 1.2 在 TLS 记录层数据分块上的不同，TLS 1.2 有的一般特性，在 TLS 1.3 中也同样存在，例如：实现方绝不能发送握手类型的零长度片段，即使这些片段包含填充；应用数据片段可以拆分为多个记录，也可以合并为一个记录。下文中 TLS 1.3 和 TLS 1.2 相同点就不在赘述了，只会对比出 TLS 1.3 和 TLS 1.2 的不同点。


