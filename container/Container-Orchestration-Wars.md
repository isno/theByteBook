# 7.1 容器编排之争

为什么 Docker 在容器化技术满天下的时代脱颖而出？Docker 又因何落幕，Kubernetes 为何成为云原生时代的王者？对于以上的问题，如果笔者照本宣科地介绍 Kubernetes 架构如何新颖、设计如何优秀，相信并不能给读者们留有什么深刻印象，教条式介绍睡过一觉不会有多少人记起。

故事让内容变得有趣，**在容器技术变革的浪潮中，曾发生过一场”史诗大战“，业界称之为 ”容器编排之争（Container Orchestration Wars）“**。本篇我们回顾这段历史，从宏观角度去观察 Kubernetes 的诞生与演变的驱动力。把时间线拉长，在当时或许认为是偶然的事件，站在尘埃落地的今天看起来却又全是必然。

**容器技术的兴起源于 PaaS 技术的普及**，IaaS 阶段的虚拟机还是太过于笨重，每一台虚拟机都需要消耗CPU、内存等计算资源才能支撑应用的运行，即便应用再小，系统的开销都是固定的成本。在 IaaS 时代，云计算厂商一直思考的一个主题是如何充分利用资源。

2013 年开始，云计算正式进入了 PaaS 时代，**在 PaaS 时代，云计算所销售的单元从虚拟机变成了应用运行平台，云厂商提供的服务更多，资源利用率自然也更高**。

## 1. 从 Cloud Foundry 开始

最早出现在开发者视野中的 PaaS 开源项目当属 VMware 创立的 Cloud Foundry，与 IaaS 提供云上虚拟机的服务方式不同，基于 Cloud Foundry 的云计算能够提供应用托管的功能，开发者只需要通过一条简单的命令比如：cf push "我的应用"，就可以将项目打成一个压缩包，把压缩包上传到 Cloud Foundry 服务器之后 Cloud foundry 会开启调度器，在一群云主机中找到满足用户需求的主机（系统版本、性能、个数），通过容器化技术在选中的主机上创建容器，之后在容器内下载压缩包，解压并运行，最终成为一个对外提供服务的应用。

此外，Cloud Foundry 平台对这些应用项目提供分发，灾备，监控，重启等等服务。这种托管服务**解放了开发者的生产力，让他们不用再关心应用的运维状况，而是专心开发自己的应用，而这也就是 PaaS 的“初心” -- 平台即服务**。

## 2. 从 Cloud Foundry 到 Docker

Cloud Foundry 最核心的组件就是应用的打包和分发机制，这也是开发者打交道最多的功能，但就是这个打包功能，成了 Cloud Foundry 的软肋，一直为用户所诟病。Cloud Foundry 为每一种主流的语言都定义了一套打包的方式，开发者不得不为每一种语言、每一种框架、甚至是每个版本应用维护一个打好的包。除此，这种方式还有可能出现本机运行成功，打了个包上传之后就无法运行的情况。本来是为赋能开发者的而生的技术，却对开发者极不友好。当开发者的抱怨积累到一定程度，想要在 PaaS 浪潮中央站稳脚跟的 Cloud Foundry 被后起之秀 Docker “红牌罚出局”也就顺理成章。

最初，Docker 还是一个叫 dotCloud 的公司，dotCloud 最初阶段也是选择 LXC 来快速部署软件，使用 LXC 虽然可以解决应用隔离的问题，但不能解决应用可移植性问题，为此 dotCloud 开发了一套内部管理工具，方便创建和管理容器，这个工具就是后来的 Docker。

虽然 dotCloud 拥有创新的容器技术，但受限于公司的知名度和 PaaS 整体市场规模，其业务并没有太大的起色，外加巨头不断进场搅局，使当时的 dotCloud 举步维艰，正当他们坚持不下去的时候，Solumon Hykes（dot Cloud 创始人）脑子里蹦出了开源的想法。2013 年 3 月，dotCloud 开源了其容器技术，将其正式命名为 Docker 项目。Docker 项目在开源后的短短几个月内就迅速崛起，成为一个不容忽视的 PaaS 技术方案，吸引了无数云服务开发者的眼球。

滑稽的是，在 Docker 刚开源的时候，Cloud Foundry 的产品经理 James Bayer 就在社区做了一次详细的对比，告诉用户 Docker 和 Cloud Foundry 一样，都是使用了 Namespace 和 Cgroups 技术的沙箱而已，无需值得关注。事实上，Docker 也确实就和他所说的一样，采用了这个“传统”的技术方案，但是 Docker 与 Cloud Foundry 相比，做了一点”小小的创新“，而这个创新无不体现 Solumon Hykes 的远见，**从 dotCloud 创建开始，Solumon Hykes 就一直在考虑应用打包的一致性与复用性问题，并提出了创新的解决方案，最终对 Cloud Foundry 造成了毁灭性的打击，这个解决方案就是 Docker 镜像**。

正式 Docker Image 这个“微不足道的创新”，让 Docker 席卷整个 PaaS 领域。比起 Cloud Foundry 那种执行文件+启动脚本的打包方式，**Docker 镜像完美解决了两个问题：本地环境和服务器环境的差异、同一份镜像可以让所有的机器进行复用**。

从这一刻开始，PaaS 的市场已经完全是 Docker 的天下。

## 3. Kubernetes 入场

每一波技术浪潮都会带来新的机会，科技的进步与商机是一对相辅相成的孪生兄弟。Docker 项目利用自己创新的 Docker Image 瞬间爆红，众多厂商也从中发现商机，开始围绕容器编排做一些思考和布局，这其中就包括云计算概念的最早提出者 Google 公司。

虽然 Google 公司名声显赫，有强大的技术实力和资金实力，但在当时提到云计算，人们首先想到的却是 AWS，Google 也一直想法设法扭转局面，随着 Docker 的成功，他们从大火的容器市场看到了新的机会。

Google 对容器也算知根知底，2007 年提交了 cgroup 到 Linux 内核，如今已经演变成容器运行时的基础。**2008 年 PaaS 平台 GAE 就已经采用了 LXC，并且开发了一套进行容器编排和调度的内部工具，也就是 Kubernetes 的前身 -- Borg**。凭借多年运行 GCP（Google Cloud Platform，Google云端平台）和 Borg 的经验，使得 Google 非常认可容器技术，也深知目前 Docker 在规模化使用场景下的不足。如果 Google 率先做好这件事不仅能让自己在云计算市场扳回一局，而且也能抓住一些新的商业机会。比如，在 AWS 上运行的应用有可能自由地移植到 GCP 上运行，这对于 Google 的云计算业务无疑极其有利。

为了使 Google 能够抓住这次机会，2013 年夏天，Kubernetes 联合创始人 Craig McLuckie、Joe Beda 和 Brendan Burns 开始讨论借鉴 Borg 的经验进行容器编排系统的开发。Kubernetes 项目获批后，Google 在 2014 年 6 月的 DockerCon 大会上正式宣布将其开源，也标志着容器编排的竞赛正式拉开帷幕。

## 4. Docker Swarm 入场

实际上，当时并不是只有 Google 看到了容器市场的机会。在 DockerCon 2014 大会上，有多家公司推出了自己的容器编排系统，我们今天所熟知的项目几乎有一半都是在这次大会上宣布发布或开源的，而 Google 的进场让竞争变得更加激烈。

随着 DockerCon 2014 大会的落幕，Docker 公司也意识到自己仅仅是云计算技术栈中的幕后英雄，容器平台化能力才是致胜的关键，单纯解决应用打包并没有价值，只能当做平台最终部署应用的载体，企业真正需要解决的是应用部署问题。于是迅速调整了战略方向，再度向 PaaS 进军。

凭借在容器引擎市场的巨大成功以及先天的 PaaS 基因，Docker 进入容器编排领域是手到擒来。2014 年 7 月，Docker 收购了 OrchardLabs，正式涉足容器编排领域。Orchard Labs 的容器编排工具 fig 当时很有名，而这个 fig 就是 DockerCompose 的前身。

Docker Compose 虽然能编排多个容器，但是只能对单个服务器上的容器进行操作，不能实现在多个机器上进行容器的创建和管理。于是 Docker 在 2014 年底又发布了 Swarm 项目，并且不断招兵买马，充实着自己的平台化能力。如果说 Docker Compose 和 Kubernetes 还不算正面竞争的话，那么 Docker Swarm 的发布，则是正式向 Kubernetes 宣战。

Docker Swarm 可以在多个服务器上创建容器集群服务，而且依然保持着 Docker 的友好命令风格，几个命令就可以完成多机集群部署。因为它平滑地内置于 Docker 平台中，在容器规模较小的场景下，所以许多用户更喜欢使用 Docker Swarm。如果 Docker Swarm 能成功，那 Docker 就将通吃容器市场，此时的 Docker 掌握着容器的绝对话语权。

## 5. Mesos 备受追捧

Mesos 是当时容器编排市场上另一个主要玩家，在 DockerCon 2014 大会之前就已经有很多公司在使用了。Mesos 最初是加州伯克利大学 RAD 实验室 2009 年启动的一个学术研究项目，目标是创建下一代集群管理器，致力于提高集群的利用效率和性能。作为一个面向资源管理的项目，容器编排其实只是其中的一个名叫 Marathon 的功能模块。

2010 年，Twitter 正值基础架构混乱不堪的时刻，他们看到了 Mesos 这个项目，随后马上应用到了 Twitter，成为 Twitter 自定义 PaaS 的实现基础，管理着 Twitter 超过 30 万台服务器上的应用部署。Benjamin Hindman（Mesos 项目负责人）当时也加入了 Twitter，负责开发和部署 Mesos，Twitter 的这套基于 Mesos 的 PaaS 解决方案就是后来的 Apache Aurora。

2013 年，Benjamin Hindman 离开 Twitter 成立了一个名为 Mesosphere 的公司，专注于打造生产级商业化 Mesos 平台，Mesosphere 正式成为 Mesos 背后的公司。在后期的 Mesos 开发、商业化运营、与 Kubernetes 的竞争中几乎都由 Mesosphere 在主导和支撑。

Mesosphere 成立后就备受资本的追捧，自 2014 年 6 月至 2018 年 5 月共完成 A 到 D 轮四轮融资，金额分别为 1050 万美元、3600 万美元、7350 万美元和 1.25 亿美元，投资方包括 A16Z、Fuel Capital、微软等。Mesosphere 最高估值是 D 轮之后达到 7.75 亿美金。

Mesos 在 2014 年成为首批支持 Docker 容器的容器编排框架之一。实际上，Mesos 并不关心谁会在它的基础上运行。Mesos 可以为 Java 应用服务器提供集群服务，也可以为 Docker 容器提供编排能力。当时，Mesos 的最大优势是它在运行关键任务时的成熟度，它比其他许多的容器技术更成熟、更可靠。

Mesos 在 Twitter 的成功应用后，也吸引了全世界其他知名公司的采纳，比如 Airbnb、eBay 和 Netflix 等等，甚至 2015 年 Apple 的 Siri 就是运行在 Mesos 上，Mesos 也因此曾经火极一时。至于微软，他不仅投资了 Mesosphere，还让他的 Azure 平台率先支持了 Mesos。


## 6. Kubernetes 扭转局势

面对 Kubernetes 的出现，一场 Docker 和 Kubernetes 之间的容器之战就此打响。

Kubernetes 如果要和 Docker 对抗，肯定不能仅仅只做 Docker 容器管理这种 Docker 本身就已经支持的功能了，这样的话别说分庭抗礼，可能连 Docker 的基本用户都吸引不到。因此在 Kubernetes 设计之初，就确定了不以 Docker 为核心依赖的设计理念。在 Kubernetes 中，Docker 仅是容器运行时实现的一个可选项，用户可以依据自己的喜好任意调换自己需要的容器内容且 Kubernetes 为这些容器都提供了接口。

虽然 Kubernetes 受到广泛的关注，但也有不少人担心 Kubernetes 的开源策略。因为 Kubernetes 开源项目的实际控制权仍然是 Google，比如，项目参与者要签版权协议，仍然是 Google 的版权，而一些大公司并不愿意自己的员工签署这样的协议。

为了让 Kubernetes 项目被更多组织接受，Google、RedHat 等企业在 2015 年 7 月共同发起成立了 CNCF（Cloud Native Computing Foundation）的基金会，希望以 Kubernetes 项目为基础，建立一个按照开源基金会方式运营的开源社区，来对抗以 Docker 公司为核心的容器商业生态。RedHat 的长处就是有着成熟的社区管理体系，并且也有足够多的工程能力，这使得 Kubernetes 项目在交由社区维护开始迅速发展，并且逐渐开始和 Docker 分庭抗礼。

和 Docker 的封闭商业模式不同，Kubernetes 反其道而行之主打开源和民主化，每一个重要功能都给用户提供了可定制化的接口，并且普通用户也可以无权限拉取修改 Kubernetes 的代码，社区有专门的 reviewer 以及 approver，只要你的 PR 通过了代码审核和批准，就会被合并到 Kubernetes 的主干，这也大大的增加了 Kubernetes 的活力，依托于开放性接口，基于 Kubernetes 的开源项目和插件比比皆是，并且依托于优秀的架构设计，微服务等新兴的技术理念也迅速落地，最终形成了一个百花齐放的稳定庞大的生态。

Docker 为应对 Kubernetes 在容器商业生态方面的布局，决定背水一战。2015 年 6 月，Docker 与 CoreOS、Google、红帽等公司联合发起制定了一套容器和镜像的标准与规范 —— OCI（Open Container Initiative），Docker 还将自己容器运行时 Libcontainer 捐出，并改名为 RunC 项目，交由 Linux 基金会管理。

OCI 标准意在将容器运行时和镜像的实现从 Docker 项目中完全剥离出来，这样做很显然对 Docker 不利。但从另一方面看，这对于 Docker 自身的发展也是有益的，因为它能够借助更加成熟和广泛的容器生态系统，为自己的 Swarm 等产品提供更加完整和丰富的支持，从而在生态方面能够与 Kubernetes 继续抗衡。

可惜 Docker 这番操作不但没有改变现有局势，反倒让自己陷入到更加被动的局面。2016 年 12 月 CNCF 发布了 CRI（Container Runtime Interface，容器运行时接口），直接目的就是要支持 CoreOS 的容器运行时项目 rkt。当时为了支持 rkt 要写很多兼容的代码，为了避免后续兼容其他运行时带来的维护工作，所以发布了统一的 CRI 接口，以后凡是支持 CRI 的运行时，皆可直接作为 Kubernetes 的底层运行时。

这样一来，相当于 Docker 曾经领先的容器技术被 OCI 剥离了运行时和镜像部分，而且其他运行时也都逐渐支持了 CRI，进一步增加了 RunC 的可替代性。Swarm 相较 Kubernetes 在容器编排层面的优势被削弱了，再加上 Swarm 项目自身的复杂度和封闭性，更进一步限制了其后来的发展。

## 7. Kubernetes 最终胜出

经过设计理念、架构、标准、生态等多方面的较量之后，Docker 在与 Kubernetes 的竞争中逐渐落败，Mesos 因其侧重在传统的资源管理，导致它在应对多云和集群管理时面临很多挑战，后来的 Mesos 项目发展也并不好，其标杆客户 Twitter 最后也放弃了 Mesos 改用 Kubernetes。

2017 年 10 月的 DockerCon 欧洲大会上，Docker 官方正式宣布支持 Kubernetes，决定将在自己的主打产品 Docker 企业版中内置 Kubernetes，并将 Docker 项目的容器运行时部分 Containerd 捐赠给了 CNCF 社区。

2017 年 11 月 29 日，AWS 宣布了他们的 Kubernetes 弹性容器服务 (EKS)。在 Amazon 宣布之前，Mesosphere、Pivotal 和 Docker 也宣布了对 Kubernetes 的原生支持。

2019 年 8 月 5 号，Mesosphere 宣布改名为 D2iQ，开启了围绕 Kubernetes 生命周期管理、混合云、多云的重生之旅。

2019 年 11 月，Mirantis 收购了 Docker 的企业部门，至此，纷扰的容器技术圈尘埃落定，天下归一。