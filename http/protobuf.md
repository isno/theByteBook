# 3.6 使用 Protocol buffers 序列化数据

Protocol buffers 是一种语言中立，平台无关，可扩展的序列化数据的格式。
Protocol buffers 在序列化数据方面相对 XML、JSON 来说，更加小巧、灵活、高效。一旦定义了要处理的数据的数据结构之后，就可以利用 Protocol buffers 的代码生成工具生成相关的代码。即可利用各种不同语言或从各种不同数据流中对你的结构化数据轻松读写。


## 1. 为什么要有 protocol buffers ？

开发人员如果要进行低版本、新旧协议兼容，可能会写如下类似逻辑的代码，虽然能实现多版本协议支持，不过代码比较丑陋。

```
if (version == 1.0) {
   ...
 } else if (version > 2.0) {
   if (version == 3.0) {
     ...
   }
 }
```

服务器端新旧协议(高低版本)兼容性问题，如果使用明确的格式化协议，会使新协议的迭代变得非常复杂，开发人员必须确保历史版本都能被兼容、理解， 然后才能切换开关开启新协议。

protocol buffers 的出现就是为了解决这些问题。


## 2. proto 使用示例 
目前 protocol buffers 最新版本是 proto3，在 proto 中，所有结构化的数据都被称为 message。

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

如果开头第一行不声明 `syntax = "proto3";` 则默认使用 proto2 进行解析。

每个消息定义中的每个字段都有唯一的编号，这些字段编号用于标识消息二进制格式中的字段，并且在使用消息类型后不应更改, 可以指定的最小字段编号为1，最大字段编号为2^29^-1 或 536,870,911。但注意不能使用数字 19000 到 19999，这是 Protocol Buffers 保留数字，使用时编译会报错。


### 2.1 proto3 定义 Services

如果要使用 RPC（远程过程调用）系统的消息类型，可以在 .proto 文件中定义 RPC 服务接口，protocol buffer 编译器将使用所选语言生成服务接口代码和 stubs。所以，例如，如果你定义一个 RPC 服务，入参是 SearchRequest 返回值是 SearchResponse，你可以在你的 .proto 文件中定义它，如下所示：

```
service SearchService {
  rpc Search (SearchRequest) returns (SearchResponse);
}
```
与 protocol buffer 一起使用的最直接的 RPC 系统是 gRPC。gRPC 允许通过使用特殊的 protocol buffer 编译插件，直接从 .proto 文件中生成 RPC 相关的代码。

## 3. Protocol Buffer 编码原理

### 3.1 Varints 编码

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

### 3.2 Message Structure

protocol buffer 中 message 是一系列键值对。message 的二进制版本只是使用字段号(field's number 和 wire_type)作为 key。每个字段的名称和声明类型只能在解码端通过引用消息类型的定义（即 .proto 文件）来确定。这一点也是人们常常说的 protocol buffer 比 JSON，XML 安全一点的原因，如果没有数据结构描述 .proto 文件，拿到数据以后是无法解释成正常的数据的。

<div  align="center">
	<img src="../assets/protobuf_example.png" width = "650"  align=center />
</div> 

由于采用了 tag-value 的形式，所以 option 的 field 如果有，就存在在这个 message buffer 中，如果没有，就不会在这里，这一点也算是压缩了 message 的大小了。

当消息编码时，键和值被连接成一个字节流。当消息被解码时，解析器需要能够跳过它无法识别的字段。这样，可以将新字段添加到消息中，而不会破坏不知道它们的旧程序。这就是所谓的 “向后”兼容性。

## 4. protocol buffers 的优缺点

protocol buffers 在序列化方面，与 XML、JSON 相比，有诸多优点，例如更加简单、数据体积更小、更快的反序列速度等。protocol buffers 另外一个非常棒的特性是：`向后` 兼容性好。我们不必破坏已部署的、依靠“老”数据格式的程序就可以对数据结构进行升级。这样就不必担心因为消息结构的改变而造成的大规模的代码重构或者迁移的问题。

总结 protocol buffers 的特点如下

- Protocol Buffer 利用 varint 以及 Tag - Value (Tag - Length - Value)的 编码后，二进制数据非常紧凑。选用它作为网络数据传输，消耗的网络流量更少（varint 并没有对 float 类型进行压缩）。
- Protocol Buffer 一个核心价值在于提供了一套工具自动化生成 get/set 代码，简化了多语言交互的复杂度，使得编码解码工作有了生产力。
- Protocol Buffer 具有向后兼容的特性，更新数据结构以后，老版本依旧可以兼容，这也是 Protocol Buffer 诞生之初被寄予解决的问题。