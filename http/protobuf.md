# 2.5.2 使用 Protocol Buffers 序列化数据

笔者所参与的部分业务中，在一些需要注重序列化和反序列化性能、控制传输数据量大小的业务场景中采用了 Protocol Buffers。那么这一节，我们来了解下这个数据格式，以及讨论我们为什么使用它。

Protocol Buffers （简称Protobuf 或者 pb）是 Google 公司开发的一种数据描述语言，用来描述各种数据结构。它可以用于数据存储、通信协议等方面的数据结构标准。相比于 XML 和 JSON，Protobuf 更小、更快、更简单。一旦数据结构以 .proto 文件形式被定义，可以由 protobuf 的编译器生成数据访问代码，目前已经支持了 Java, Python, Objective-C, C++, JavaNano, Ruby, JavaScript 和 Go 等多种现存编程语言。

## 1. 为什么要有 Protobuf

开发人员如果要进行低版本、新旧协议兼容，可能会写如下类似逻辑的代码，虽然能实现多版本协议支持，不过代码比较丑陋。

```
if (version == 1.0) {
   ...
} else if (version > 2.0) {
   ...
} else {
   ...
}
```
使用明确的格式协议处理服务端新旧协议（APP高低版本）等兼容性问题，会使新协议的迭代变得非常复杂，开发人员必须确保历史版本都能被兼容、理解，然后才能切换开关开启新协议。

Protobuf的出现就是为了解决这种向后兼容问题。

## 2. Protobuf 使用示例 

在 Protobuf 中，所有结构化的数据都被称为 message。

1. 定义一个 message（如果开头第一行不声明 `syntax = "proto3";` 则默认使用 proto2 进行解析）。

```
syntax = "proto3"; // 版本声明

message Person  { 
  string name = 1;
  int32 age = 2;
}  
```

2. 定义完 proto 结构体之后，根据proto文件生成java类文件。

```
proto --java_out = / Person.proto
```

3. 在 Java 中使用 Protobuf 定义的结构进行序列化数据。

```
//1、 创建Builder
PersonProto.Person.Builder builder = PersonProto.Person.newBuilder();
//2、 设置Person的属性
builder.setAge(35);
builder.setName("小李");
//3、 创建Person
PersonProto.Person person = builder.build();
//4、序列化
byte[] data = person.toByteArray();
```

4. 序列化后的数据，可以通过 RPC、HTTP等方式传递，接收方获取数据后进行反序列化。
```
PersonProto.Person person = PersonProto.Person.parseFrom(data);
System.out.println(person.getAge());
System.out.println(person.getName());
```

## 3.Protobuf 编码原理

Protobuf 的介绍中说序列化后的数据比JSON、XML更紧凑。那么思考一个简单的问题 “Protobuf 序列化后的数据传输过程中还需要压缩么？”

想知道答案，得先了解什么是Varint编码。

### 3.1 Varints 编码

Varint 是一种紧凑的表示数字的方法，它用一个或多个字节来表示一个数字。Varint 中的每个字节（最后一个字节除外）都设置了最高有效位（msb），这一位表示还会有更多字节出现。每个字节的低 7 位用于以 7 位组的形式存储数字的二进制补码表示，最低有效组首位。

如果用不到 1 个字节，那么最高有效位设为 0。如下面这个例子，1 用一个字节就可以表示，所以 msb 为 0.

```
0000 0001
```
如果需要多个字节表示，msb 就应该设置为 1 。例如 300，如果用 Varint 表示的话：
```
1010 1100 0000 0010
```

由于 300 超过了 7 位（Varint 一个字节只有 7 位能用来表示数字，最高位 msb 用来表示后面是否有更多字节），所以 300 需要用 2 个字节来表示。

读到这里可能有读者会问了，Varint 不是为了紧凑 int 的么？那 300 本来可以用 2 个字节表示，现在还是 2 个字节了，哪里紧凑了，花费的空间没有变啊！

Varint 确实是一种紧凑的表示数字的方法。比如对于 int32 类型的数字，一般需要 4 个 byte 来表示。当然凡事都有好的也有不好的一面，采用 Varint 表示法，大的数字则需要 5 个 byte 来表示。从统计的角度来说，一般不会所有的消息中的数字都是大数，因此大多数情况下，采用 Varint后，可以用更少的字节数来表示数字信息。

300 如果用 int32 表示，需要 4 个字节，现在用 Varint 表示，只需要 2 个字节了，缩小了一半！

回答上面的问题，Protobuf 序列化的 string 类型和byte类型是直接存储的，只有 int 采用了变长压缩，当然还需要压缩。

### 3.2 Message 结构

Protobuf 还有个特性：向后兼容。

这一小节，我们来了解下message的结构设计，搞明白 Protocol buffer 是怎么做到向后兼容的。

Protobuf 的 message 是一系列键值对，message 的二进制版本只是使用字段号(field's number 和 wire_type) 作为 key。每个字段的名称和声明类型只能在解码端通过引用消息类型的定义（即 .proto 文件）来确定。这一点也是人们常常说的 protocol buffer 比 JSON，XML 安全一点的原因，如果没有数据结构描述 .proto 文件，拿到数据以后无法解释成正常的数据。

<div  align="center">
	<img src="../assets/protobuf_example.png" width = "650"  align=center />
	<p>图 2-10 Protobuf Message结构</p>
</div> 

由于采用了 tag-value 的形式，所以 option 的 field 如果有，就存在在这个 message buffer 中，如果没有，就不会在这里，这一点也算是压缩了 message 的大小了。当消息编码时，键和值被连接成一个字节流。当消息被解码时，解析器需要能够跳过它无法识别的字段。这样，可以将新字段添加到消息中，而不会破坏不知道它们的旧程序。

这就是所谓的 “向后”兼容性。

## 4. 总结Protobuf的特点 

总结 Protobuf 的特点如下：

- Protobuf 利用 varint 以及 Tag - Value (Tag - Length - Value)的 编码后，二进制数据非常紧凑。选用它作为网络数据传输，消耗的网络流量相对更少。
- Protobuf 一个核心价值在于提供了一套工具自动化生成 get/set 代码，简化了多语言交互的复杂度，使得编码解码工作有了生产力。
- Protobuf 具有向后兼容的特性，更新数据结构以后，老版本依旧可以兼容，这也是 Protocol Buffer 诞生之初被寄予解决的问题。