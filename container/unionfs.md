# 7.2.3 UnionFs 联合文件系统

联合文件系统（Union File System， UnionFs）它可以不同物理位置的目录合并、挂载到同一个目录中，实际上目录的物理位置是分开的，UnionFs 允许只读和可读写目录并存，也就是说可以同时删除和增加内容。

容器镜像正是利用 UnionFs 实现了镜像分层。不过在谈镜像分层时，我们先了解以下概念：

- boofs（boot file system）：包含操作系统bootloader 和 kernel。用户不能修改bootfs，在内核启动后，bootfs 会被卸载。
- rootfs（root file system）：包含系统常见的目录结构，如/dev 、/lib、/proc、/bin、/etc/、/bin 等

容器镜像设计中，为了解决各类依赖以及依赖共享，引入了层（layer）的概念，在镜像构建中，每一个指令都会生成一个层，也就是一个增量的 rootfs，这样逐层构建，容器内部的更改都会被保存为最上面的读写层，而其他层都是只读。启动容器时再通过 UnionFs 把相关的层挂载到一个目录，作为容器的根文件系统，这就是容器镜像的原理。

<div  align="center">
	<img src="../assets/docker-filesystems-multilayer.png" width = "400"  align=center />
</div>

镜像分层技术一个突出的优点就是可以共享资源（layer），如果多个镜像都从相同 base 镜像构建而来，那么宿主机只需在磁盘上保存一份 base 镜像即可，同时内存中也只需加载一份 base 镜像，就可以为所有容器应用服务了。