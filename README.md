# 深入架构原理与实践

## ⭐️ 为什么要写这个？

这几年互联网技术出现了很大的更新迭代，比如 SDN 网络、高性能网络（DPDK、XDP）、Container、ServiceMesh 等等，我对这些技术有一些浅薄的见解和实践，但也远没达到深刻理解的境界，我尝试使用 `费曼学习法` 把这些东西体系化地总结输出。一方面是加深自我的学习认识，另一方面也希望这些输出对其他人有所帮助。

整个系列的内容主要集中在 `网络`、`集群以及服务治理`、`FinOps` 这三个主题，这也代表着基础架构的几个核心：稳定、效率、成本。


我会持续更新这个仓库的内容，如果想要关注可以点 `star` 。


## 如何阅读

- **在线阅读**：本文档在线阅读地址为：[https://www.thebyte.com.cn](https://www.thebyte.com.cn)

- **离线阅读**：

  - 部署离线站点：文档基于 [VuePress 2](https://v2.vuepress.vuejs.org/zh/) 构建，如你希望在本地搭建文档站点，请使用如下命令：

    ```bash
    # 克隆获取源码
    $ git clone https://github.com/isno/theByteBook.git && cd theByteBook

    # 安装工程依赖
    $ yarn install

    # 运行网站，地址默认为 http://localhost:8080
    $ yarn dev
    ```

## 勘误

+ 如果在文章中发现了问题，欢迎提交 PR 或者 issue

## ©️ 转载

<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="知识共享许可协议" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a><br />本<span xmlns:dct="http://purl.org/dc/terms/" href="http://purl.org/dc/dcmitype/Text" rel="dct:type">作品</span>由 <a xmlns:cc="http://creativecommons.org/ns#" href="https://github.com/isno/TheByteBook" property="cc:attributionName" rel="cc:attributionURL">isno</a> 创作，采用<a rel="license" href="http://creativecommons.org/licenses/by/4.0/">知识共享署名 4.0 国际许可协议</a>进行许可。
