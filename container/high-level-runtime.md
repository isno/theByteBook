# 7.5.2 高层运行时

低层运行时负责实际运行容器，而高层运行时（High Level Container Runtime）则负责容器映像的传输和管理，解压缩映像，然后传递到低级运行时以运行容器。

目前主流的高层容器运行时有 containerd 、CRI-O 。Docker 由于继承了更多的功能，可以理解为 High High Level Container Runtime。

<div  align="center">
	<img src="../assets/runtime.png" width = "550"  align=center />
</div>