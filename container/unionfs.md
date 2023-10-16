# 7.2.3 UnionFs 联合文件系统

联合文件系统（Union File System， UnionFs）它可以不同物理位置的目录合并、挂载到同一个目录中，而实际上目录的物理位置是分开的。UnionFs 把文件系统的每一次修改作为一个个层进行叠加，同时可以将不同目录挂载到同一个虚拟文件系统下。如果一次同时加载多个文件系统，UnionFs 会把各层文件叠加起来，最终文件系统会包含所有底层文件和目录，从外部视角看，就是一个完成的文件系统。


容器镜像设计中，为了解决各类依赖以及依赖共享，正是利用 UnionFs 实现了镜像分层，再结合 bootfs、rootfs，一层层继承、叠加。启动容器时把相关的层挂载到一个目录，作为容器的根文件系统，这就是容器镜像的原理。

- bootfs（boot file system）：包含操作系统 bootloader 和 kernel。用户不能修改 bootfs，在内核启动后，bootfs 会被卸载。
- rootfs（root file system）：包含系统常见的目录结构，如/dev 、/lib、/proc、/bin、/etc/、/bin 等

<div  align="center">
	<img src="../assets/docker-filesystems-multilayer.png" width = "400"  align=center />
</div>
