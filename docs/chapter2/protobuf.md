# 序列化数据 Protobuf

Protocol buffers 是一种语言中立，平台无关，可扩展的序列化数据的格式，可用于通信协议，数据存储等。

Protocol buffers 在序列化数据方面相对 XML、JSON 来说，更加小巧、灵活、高效。一旦定义了要处理的数据的数据结构之后，就可以利用 Protocol buffers 的代码生成工具生成相关的代码。即可利用各种不同语言或从各种不同数据流中对你的结构化数据轻松读写。

Protocol buffers 适合做数据存储或 RPC 数据交换格式。可用于通讯协议、数据存储等领域的语言无关、平台无关、可扩展的序列化结构数据格式。


### 为什么要有 protocol buffers ？

大家可能会觉得 Google搞protocol buffers 是为了解决序列化速度，其实真正的需求并不是这样子的。

protocol buffers 最先开始是 Google 用来解决索引服务器 request/response 协议的。没有 protocol buffers Google 已经存在了一种 request/response 格式，用于手动处理 request/response 的编组和反编组。它也能支持多版本协议，不过代码比较丑陋：

```
if (version == 1.0) {
   ...
 } else if (version > 2.0) {
   if (version == 3.0) {
     ...
   }
   ...
 }
```

如果非常明确的格式化协议，会使新协议变得非常复杂。因为开发人员必须确保请求发起者与处理请求的实际服务器之间的所有服务器都能理解新协议，然后才能切换开关以开始使用新协议。

这也就是每个服务器开发人员都遇到过的低版本兼容、新旧协议兼容相关的问题。

protocol buffers 为了解决这些问题，于是就诞生了。protocol buffers 最初寄予以下 2 个特点：

- 可以很容易地引入新的字段，并且不需要检查数据的中间服务器可以简单地解析并传递数据，而无需了解所有字段。
- 数据格式更加具有自我描述性，可以用各种语言来处理(C++, Java 等各种语言)

随着系统的发展和技术演进，现在Protobuf也被寄予了更多特性：

- 自动生成的序列化和反序列化代码避免了手动解析的需要
- 除了用于 RPC（远程过程调用）请求之外，人们开始将 protocol buffers 用作持久存储数据的便捷自描述格式（例如，在Bigtable中）
- 服务器的 RPC 接口可以先声明为协议的一部分，然后用 protocol compiler 生成基类，用户可以使用服务器接口的实际实现来覆盖它们

protocol buffers 诞生之初是为了解决服务器端新旧协议(高低版本)兼容性问题，名字也很体贴，“协议缓冲区”。只不过后期慢慢发展成用于传输数据。

### proto3 定义 message

目前 protocol buffers 最新版本是 proto3，与老的版本 proto2 还是有些区别的。这两个版本的 API 不完全兼容。

在 proto 中，所有结构化的数据都被称为 message。

```
syntax = "proto3";

message helloworld
{ 
   required int32     id = 1;  // ID 
   required string    str = 2;  // str 
   optional int32     opt = 3;  //optional field 
}
```

上面这几行语句，定义了一个消息 helloworld，该消息有三个成员，类型为 int32 的 id，另一个为类型为 string 的成员 str。opt 是一个可选的成员，即消息中可以不包含该成员。

如果开头第一行不声明 syntax = "proto3"; 则默认使用 proto2 进行解析。

** Protobuf 中的字段号 **

每个消息定义中的每个字段都有唯一的编号。这些字段编号用于标识消息二进制格式中的字段，并且在使用消息类型后不应更改, 可以指定的最小字段编号为1，最大字段编号为2^29^-1 或 536,870,911。但注意不能使用数字 19000 到 19999，这是Protocol Buffers保留数字，使用时编译会报错。


### proto3 定义 Services

如果要使用 RPC（远程过程调用）系统的消息类型，可以在 .proto 文件中定义 RPC 服务接口，protocol buffer 编译器将使用所选语言生成服务接口代码和 stubs。所以，例如，如果你定义一个 RPC 服务，入参是 SearchRequest 返回值是 SearchResponse，你可以在你的 .proto 文件中定义它，如下所示：

```
service SearchService {
  rpc Search (SearchRequest) returns (SearchResponse);
}

```

与 protocol buffer 一起使用的最直接的 RPC 系统是 gRPC：在谷歌开发的语言和平台中立的开源 RPC 系统。gRPC 在 protocol buffer 中工作得非常好，并且允许你通过使用特殊的 protocol buffer 编译插件，直接从 .proto 文件中生成 RPC 相关的代码。

如果你不想使用 gRPC，也可以在你自己的 RPC 实现中使用 protocol buffers。您可以在 Proto2 语言指南中找到更多关于这些相关的信息。

还有一些正在进行的第三方项目为 Protocol Buffers 开发 RPC 实现。

### Protocol Buffer 编码原理

在讨论 Protocol Buffer 编码原理之前，必须先谈谈 Varints 编码。

Varint 是一种紧凑的表示数字的方法。它用一个或多个字节来表示一个数字，值越小的数字使用越少的字节数。这能减少用来表示数字的字节数。

Varint 中的每个字节（最后一个字节除外）都设置了最高有效位（msb），这一位表示还会有更多字节出现。每个字节的低 7 位用于以 7 位组的形式存储数字的二进制补码表示，最低有效组首位。

如果用不到 1 个字节，那么最高有效位设为 0 ，如下面这个例子，1 用一个字节就可以表示，所以 msb 为 0.

```
0000 0001
```
如果需要多个字节表示，msb 就应该设置为 1 。例如 300，如果用 Varint 表示的话：
```
1010 1100 0000 0010

```
由于 300 超过了 7 位（Varint 一个字节只有 7 位能用来表示数字，最高位 msb 用来表示后面是否有更多字节），所以 300 需要用 2 个字节来表示。


读到这里可能有读者会问了，Varint 不是为了紧凑 int 的么？那 300 本来可以用 2 个字节表示，现在还是 2 个字节了，哪里紧凑了，花费的空间没有变啊？！

Varint 确实是一种紧凑的表示数字的方法。它用一个或多个字节来表示一个数字，值越小的数字使用越少的字节数。这能减少用来表示数字的字节数。比如对于 int32 类型的数字，一般需要 4 个 byte 来表示。但是采用 Varint，对于很小的 int32 类型的数字，则可以用 1 个 byte 来表示。当然凡事都有好的也有不好的一面，采用 Varint 表示法，大的数字则需要 5 个 byte 来表示。从统计的角度来说，一般不会所有的消息中的数字都是大数，因此大多数情况下，采用 Varint 后，可以用更少的字节数来表示数字信息。

300 如果用 int32 表示，需要 4 个字节，现在用 Varint 表示，只需要 2 个字节了。缩小了一半！

### Message Structure
protocol buffer 中 message 是一系列键值对。message 的二进制版本只是使用字段号(field's number 和 wire_type)作为 key。每个字段的名称和声明类型只能在解码端通过引用消息类型的定义（即 .proto 文件）来确定。这一点也是人们常常说的 protocol buffer 比 JSON，XML 安全一点的原因，如果没有数据结构描述 .proto 文件，拿到数据以后是无法解释成正常的数据的。


<div  align="center">
	<img src="/assets/chapter2/protobuf_example.png" width = "650"  align=center />
</div> 

由于采用了 tag-value 的形式，所以 option 的 field 如果有，就存在在这个 message buffer 中，如果没有，就不会在这里，这一点也算是压缩了 message 的大小了。

当消息编码时，键和值被连接成一个字节流。当消息被解码时，解析器需要能够跳过它无法识别的字段。这样，可以将新字段添加到消息中，而不会破坏不知道它们的旧程序。这就是所谓的 “向后”兼容性。

### protocol buffers 的优缺点

protocol buffers 在序列化方面，与 XML 相比，有诸多优点：
- 更加简单
- 数据体积小 3- 10 倍
- 更快的反序列化速度，提高 20 - 100 倍
- 可以自动化生成更易于编码方式使用的数据访问类

举个例子：

如果要编码一个用户的名字和 email 信息，用 XML 的方式如下：

```
<person>
    <name>John Doe</name>
    <email>jdoe@example.com</email>
  </person>
```

相同需求，如果换成 protocol buffers 来实现，定义文件如下：

```
person {
  name: "John Doe"
  email: "jdoe@example.com"
}
```

protocol buffers 通过编码以后，以二进制的方式进行数据传输，最多只需要 28 bytes 空间和 100-200 ns 的反序列化时间。但是 XML 则至少需要 69 bytes 空间（经过压缩以后，去掉所有空格）和 5000-10000 的反序列化时间。

protocol buffers 另外一个非常棒的特性是：“向后”兼容性好。

人们不必破坏已部署的、依靠“老”数据格式的程序就可以对数据结构进行升级。这样您的程序就可以不必担心因为消息结构的改变而造成的大规模的代码重构或者迁移的问题。因为添加新的消息中的 field 并不会引起已经发布的程序的任何改变(因为存储方式本来就是无序的，k-v 形式)。


### 总结Protobuf的特点

- Protocol Buffer 利用 varint 原理压缩数据以后，二进制数据非常紧凑，option 也算是压缩体积的一个举措。所以 pb 体积更小，如果选用它作为网络数据传输，势必相同数据，消耗的网络流量更少。但是并没有压缩到极限，float、double 浮点型都没有压缩。
- Protocol Buffer 比 JSON 和 XML 少了 {、}、: 这些符号，体积也减少一些。再加上 varint 压缩，gzip 压缩以后体积更小！
- Protocol Buffer 是 Tag - Value (Tag - Length - Value)的编码方式的实现，减少了分隔符的使用，数据存储更加紧凑。
- Protocol Buffer 另外一个核心价值在于提供了一套工具，一个编译工具，自动化生成 get/set 代码。简化了多语言交互的复杂度，使得编码解码工作有了生产力。
- Protocol Buffer 不是自我描述的，离开了数据描述 .proto 文件，就无法理解二进制数据流。这点即是优点，使数据具有一定的“加密性”，也是缺点，数据可读性极差。所以 Protocol Buffer 非常适合内部服务之间 RPC 调用和传递数据。
- Protocol Buffer 具有向后兼容的特性，更新数据结构以后，老版本依旧可以兼容，这也是 Protocol Buffer 诞生之初被寄予解决的问题。因为编译器对不识别的新增字段会跳过不处理。