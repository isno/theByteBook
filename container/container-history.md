# 7.1 容器技术编年史


IaaS 时代的虚拟机还是太过于笨重。每一台虚拟机都需要消耗CPU、内存等计算资源才能支撑应用的运行。即便应用再小，系统的开销都是固定的成本。如何为 IaaS 减肥，让虚拟机系统的开销降到最低？这个答案得云计算要发展到 PaaS 时代才能找到。

2013 年开始，云计算正式进入了 PaaS 时代。PaaS 时代，云计算所销售的单元，从虚拟机变成了应用运行平台。于是，云厂商提供的服务更多，资源利用率也更高了。

那云厂商该如何构建一套好用的 PaaS 服务呢？借力开源项目，成为各厂商的共识。

## Cloud Foundry 开启 PaaS 开源时代

PaaS的核心是平台。最早出现在开发者视野中的PaaS开源项目中，vmware创立的Cloud Foundry是知名度最高的。与IaaS提供云上虚拟机的服务方式不同，基于Cloud Foundry的云计算能够提供应用托管的功能。开发者只需要通过一条简单的命令比如：cf push "我的应用"，就可以将项目打成一个压缩包，上传到Cloud Foundry服务器。而Cloud foundry会开启自己的调度器，在一群云主机中找到满足用户需求的主机（系统版本、性能、个数），然后通过容器化技术，在主机上创建一个容器，在容器中下载压缩包，解压并运行，最终成为一个对外提供服务的应用。

此外，Cloud Foundry平台对这些应用项目提供分发，灾备，监控，重启等等服务（这也是我们提供给用户的核心服务）。这种托管服务解放了开发者的生产力，让他们不用再关心应用的运维状况，而是专心开发自己的应用。而这就是PaaS的“初心”，平台即服务。


## 从 Cloud Foundry 到 Docker

Docker 项目利用自己创新的 Docker Image 瞬间爆红，众多厂商也从中发现商机，纷纷推出自己的容器产品，想在市场中分一杯羹。CoreOS推出了Rocket（rkt）容器，Google 也开源了自己的容器项目 lmctfy（Let Me Container That For You）等，但是面对 Docker 项目的强势，就算是 Google 这种大佬也毫无招架之力。因此 Google 打算和 Docker 公司开展合作，关停自己的容器项目，并且和 Docker 公司一同维护开源的容器运行，但是 Docker 公司方面很强势的拒绝了这个明显会削弱自己地位的合作。

此时 Docker 公司也意识到自己仅仅是云计算技术栈中的幕后英雄，只能当做平台最终部署应用的载体。如果想要成为这个领域的核心，就应该有自己的 PaaS 生态。Docker 爆火之后有了充足的资金，开始收购其他的项目来扩充自己的实力，其中最出名的就署名 Fig，也就是 Docker Compose 项目的前身。

通过这些并购与自身研发迭代，Docker 公司最终推出了以自己为核心的 PaaS 三件套：Docker Compose、Docker Swarm 以及 Docker Machine。



Kubernetes 是 Google 公司早在 2014 年就发布开源的一个容器基础设施编排框架，和其他拍脑袋想出来的技术不同，Kubernetes 的技术是有理论依据的，即 -- Borg。

Borg 是 Google 公司整个基础设施体系中的一部分，Google 也发布了多篇关于 Borg 的论文作为其理论支持。其上承载了比如 MapReduce、BigTable 等诸多业界的头部技术，Borg 项目当仁不让地位居整个基础设施技术栈的最底层。因此 Borg 系统一直以来都被誉为 Google 公司内部最强大的“秘密武器”，也是 Google 公司最不可能开源的项目，Kubernetes 项目从一开始就比较幸运地站上了一个他人难以企及的高度。

<div  align="center">
	<img src="../assets/borg.jpeg" width = "600"  align=center />
	<p>Google Omega 论文所描述的 Google 已公开的基础设施栈</p>
</div>

面对 Kubernetes 的出现，一场 Docker 和 Kubernetes 之间的容器之战就此打响。

在这场对抗之初，由于 Kubernetes 开发灵感和设计思想来源于 Borg，Kubernetes项 目在刚发布时就被称为曲高和寡。太过超前的思想让开发者无法理解，同时由于 Kubernetes 项目一直由 Google 的工程师自行维护，所以在发布之初并没有获得太多的关注和成长。

然而，CNCF 的成立改变了这一切，RedHat 的长处就是有着成熟的社区管理体系，并且也有足够多的工程能力，这使得 Kubernetes 项目在交由社区维护开始迅速发展，并且逐渐开始和 Docker 分庭抗礼。并且和 Docker 的封闭商业模式不同，Kubernetes 反其道而行之主打开源和民主化，每一个重要功能都给用户提供了可定制化的接口，并且普通用户也可以无权限拉取修改 Kubernetes 的代码，社区有专门的 reviewer 以及 approver，只要你的 PR 通过了代码审核和批准，就会被合并到 Kubernetes 的主干，这也大大的增加了 Kubernetes 的活力。并且，依托于开放性接口，基于 Kubernetes 的开源项目和插件比比皆是，并且依托于优秀的架构设计，微服务等新兴的技术理念也迅速落地，最终形成了一个百花齐放的稳定庞大的生态。

反观 Docker 只能通过自己的工程师修改，在这一点上与 Kubernetes 相比就与远落下风。

面对 Kubernetes 社区的崛起和壮大，Docker 公司不得不承认自己的豪赌以失败告终，从 2017 年开始，Docker 将 Docker 项目的容器运行时部分 Containerd 捐赠给了 CNCF 社区，并且在当年 10 月宣布将在自己的 Docker 企业版中内置 Kubernetes 项目，这也标志着持续了近两年的容器编排之战落下帷幕。

2018年1月，RedHat 公司宣布斥资 2.5 亿美元收购 CoreOS，2018 年 3 月，这一切纷争的始作俑者 Docker 公司的 CTO Solomon Hykes 宣布辞职，至此，纷扰的容器技术圈尘埃落定，天下归一。