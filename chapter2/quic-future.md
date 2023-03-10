# QUIC协议的未来

虽然QUIC协议是因为HTTP/3而提出来，但QUIC的未来应该不仅限于HTTP/3。

QUIC已具备的一些特性，不仅可以让现有的Web应用运行得更快更安全，还能适配到更多应用场景上，比如IoT、VR、音视频会议等。基于QUIC协议之上，工程师们可以定制开发更多场景的应用，同时也让QUIC协议具备的能力更加完善。

结合流媒体业务场景，我们主要关注QUIC协议在音视频传输领域的未来发展：QUIC Datagram和QUIC Multipath 。

### QUIC Datagram——An Unreliable Datagram Extension to QUIC（QUIC的非可靠数据报文传输扩展）

UIC v1（RFC9000）提供了一个安全、可靠、多路复用的传输方案，QUIC Stream数据流是QUIC主要数据传输的载体，可靠传输是其需要保证的基本功能。

但是有些应用场景并不需要严格的可靠传输，例如实时音视频、在线游戏等。现在这些场景有些是直接基于自定义UDP或者WebRTC实现的。自定义UDP实现传输层功能的话比较麻烦，工程量大，有时候为了安全考虑还需要加上DTLS支持，而WebRTC的建立数据传输通道流程也比较繁琐，WebRTC主要场景是为了P2P设计的，长远来看并不适合客户端服务端的场景。

因此，QUIC支持不可靠数据传输能够让QUIC协议的应用范围更广，适合更多的应用场景，而且QUIC之上的不可靠数据传输能够很好地复用QUIC的安全特性。

#### QUIC Datagram特点

- 同一QUIC连接里面可以同时包含可靠Stream传输和不可靠数据传输，它们可以共享一次握手信息，分别可以作用于TLS和DTLS，可降低握手延迟。
- QUIC在握手上比DTLS更加精准，它对每个握手数据包加上了超时重传定时器，能够快速感知握手包的丢失和恢复。
- QUIC Datagram的不可靠传输也可以被ACK，这是一个选项，如果有ACK，可以让应用程序感知到QUIC Datagram的成功接收。
- QUIC Datagram也适用于QUIC的CC。

这些特性能够让实时音视频流、在线游戏和实时网络服务等应用的传输得到极大的效率提升。

<div  align="center">
	<p>WebTransport呼之欲出</p>
	<img src="/assets/chapter2/quic-2.png" width = "500"  align=center />
</div>

WebTransport是一个框架型的协议[14]，该协议使客户端与远程服务器端在安全模型下通信，并且采用安全多路复用传输技术。注意：WebTransport是一个框架，在它下面是实际的协议，框架提供了一个一致的接口，因此它由一组可以安全地暴露给不受信任的应用程序的协议以及一个允许它们互换使用的模型组成。它还提供了一组灵活的功能，为我们提供了可靠的单向和双向流以及非可靠的数据报文传输。

### QUIC Multipath

QUIC Multipath多路径传输，简言之就是用多个物理网络路径来传输数据，可以同时使用WIFI、LTE/4G或者IPV4/IPV6。随着音视频的消费码率越来越高，对网络连接的吞吐能力要求越来越高，单路径的网络情况开始捉襟见肘，MP-QUIC可以发挥比较大的作用。比如在超高清、超高码率视频8K、VR等场景。

MP-QUIC基本思路是: 用多个网络路径来组成一个QUIC连接进行数据传输，MP-QUIC其实也是对连接迁移特性的一次拓展，协议标准也在草案阶段。用多个网络路径实现一个QUIC连接看似简单，其实实现上有很多事情需要考虑：

- 异构网络
- 数据包冗余分配和流量成本之间的ROI
- 多路径调度策略

<div  align="center">
	<p></p>
	<img src="/assets/chapter2/quic-cid.png" width = "500"  align=center />
</div>

协议标准目前只规定了多路径实现的机制，也就是多个单向的UniFlow组成QUIC连接，多路径调度和冗余包策略都需要额外单独实现。不过随着业务场景需求的展开和协议标准的正式推出，相信MP-QUIC在音视频传输上的应用会越来越多。