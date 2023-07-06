# 7.2.3 UnionFS 联合文件系统

联合文件系统（Union File System， UnionFS）它可以不同物理位置的目录合并、挂载到同一个目录中，而目录的物理位置实际是分开的，UnionFS 允许只读和可读写目录并存，也就是说可以同时删除和增加内容。在谈镜像的分层时，我们先了解以下概念：

- boofs（boot file system）：包含操作系统bootloader 和 kernel。用户不能修改bootfs，在内核启动后，bootfs 会被卸载。
- rootfs（root file system）：包含系统常见的目录结构，如/dev 、/lib、/proc、/bin、/etc/、/bin 等

Docker镜像的设计中，为了解决各类依赖以及依赖共享，引入了层（layer）的概念，在镜像的构建中，每一个指令都会生成一个层，也就是一个增量的 rootfs，这样逐层构建，容器内部的更改都会被保存为最上面的读写层，而其他层都是只读。启动容器的时候通过 UnionFS 把相关的层挂载到一个目录，作为容器的根文件系统。


<div  align="center">
	<img src="../assets/docker-filesystems-multilayer.png" width = "400"  align=center />
</div>


总结镜像使用分层有如下好处:

- 分层最大的一个好处就是共享资源。
- 有多个镜像都从相同的 base 镜像构建而来，那么宿主机只需在磁盘上保存一份 base 镜像。
- 同时内存中也只需加载一份 base 镜像，就可以为所有容器服务了，而且镜像的每一层都可以被共享。