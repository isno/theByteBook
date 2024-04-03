# 隐私安全问题

GitOps 的核心原则之一就是：一切皆代码，随后用 GitHub/GitLab 等对代码进行版本控制。这就引出了第一个问题：**代码中的敏感信息怎么处理**？



## 从源头把控

git-secrets 就是一款用来从源头把控敏感信息的工具。 

:::tip git-secrets 是什么
git-secrets 是AWS Lab开发的一款用来防止将敏感信息提交到git仓库的工具。

git-secrets 通过分析源码文件的特征来和已设置好的敏感信息pattern来进行匹配，如果匹配到，则认为源码里面包含敏感信息，从而阻止将源码提交到git 仓库。如果敏感信息pattern设置的好，则可以很好的从源头来防止敏感信息的泄漏。
:::

使用 git-secrets 可以有效防范你所在的公司出现在新闻或者社区的讨论中：愚蠢的 xx，居然把明文密码暴露在仓库 github 中。

## 对敏感信息进行加密

<div  align="center">
	<img src="../assets/2021-02-secrets-management.svg" align=center />
	<p>Secrets Management Technology Radar</p>
</div>

从技术雷达看，有多种手段诸如 Vault、Sealed Secrets、Sops 等开源产品，也有 AWS KMS、GCP Secrets Management 等厂商提供的产品。

但不管采用哪种工具，背后的原理大都采用**非对称加密**[^1]的方式：
- 加密是通过 public key 将敏感信息进行加密。
- 解密通过 private key 将加密信息解密，并生成 kubernetes 能识别的 secret 资源，最终被应用程序所使用。


[^1]: 非对称加密原理可以回顾本书 2.5.1节《理解 HTTPS 流程》内容
