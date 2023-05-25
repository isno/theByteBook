# 镜像仓库 Harbor

Pod 在启动之前需要先用镜像仓库拉取镜像，如果是企业私有化部署 Kubernetes，为了更好的性能和安全，都会自建私有镜像仓库。自建仓库一般要求多租户、访问控制、活动审计等功能，VMwar 开源的 Harbor 是最常用的镜像仓库，Harbor 也是 CNCF 的孵化项目。

Harbor 以 Docker 公司开源的 registry 为基础，包括了权限管理 (RBAC)、LDAP、审计、管理界面、自我注册、HA 等企业必需的功能。

## Harbor 高可用部署

Harbor 支持高可用部署，将多个 Harbor 和负载均衡集成，每一个Harbor 通过对接 MySQL、Redis 共享集群元数据，镜像仓库对接对象存储，从而将 Harbor 镜像仓库做成高可用无状态服务。


<div  align="center">
	<img src="../assets/Harbor.png" width = "400"  align=center />
</div>


## Harbor 的特点：镜像复制

Harbor 一个亮点是它的镜像复制功能，在多机房部署场景中，镜像需要在多个镜像仓库之间相互复制，Harbor 提供了多个镜像仓库复制的功能， 用户可以选择某个项目复制到指定远程仓库，触发模式包括手动、定时、和即刻。

Harbor 的镜像复制基于 Docker Registry API，内容通过状态机维护镜像推送状态，首先通过本地仓库 API 获取镜像元数据 mainfest，从而获取分层的 Hash。校验镜像分层是否已经存在在远程仓库。 如果不存在，则推送到远程仓库，最后上传元数据，完成镜像推送。