# 10.3 解决 IaC 后的隐私安全问题

GitOps 的核心原则之一是**一切皆代码**，随后用 GitHub/GitLab 等对代码进行版本控制。

此处，引出第一个问题：**代码中的敏感信息怎么处理**？你肯定不希望你的公司出现在新闻或者社区讨论中：xx 公司的工程师居然把密钥/密码推送到了 github 中! 这样的案例可不少见。

杜绝此类问题可以使用源头把控以及对敏感信息加密两种方式。

## 从源头把控

源头把控的思路主要是利用 Git Hooks[^1]（例如 pre-commit ）在 Git 操作执行前执行代码审查、密码检查等拒绝潜在敏感信息的提交。

通过配置 Gitlab 的 Push Rules 或者安装 git-secrets 此类的工具，触发 hook 后，扫描提交（commit）、提交消息（commit message）和合并（merge） 等，如果任何提交与配置的、禁用的正则表达式模式之一相匹配，则该提交将被拒绝。

如果敏感信息规则设置恰当，则可以有效的从源头来防止敏感信息的泄漏。

## 对敏感信息进行加密

如果把敏感信息进行加密后再推送至仓库，只要保证加密所用的 key，那也能保证敏感信息不会被泄漏。

关于加密所用的手段，可以查看 CNCF 发布的 Secrets Management Technology Radar。如下图

<div  align="center">
	<img src="../assets/2021-02-secrets-management.svg" align=center />
	<p>Secrets Management Technology Radar</p>
</div>

从技术雷达看，有多种手段诸如 Vault、Sealed Secrets、Sops 等开源产品，也有 AWS KMS、GCP Secrets Management 等厂商提供的产品。

但不管采用哪种工具，背后的原理大都采用**非对称加密**[^2]的方式：
- 加密是通过 public key 将敏感信息进行加密。
- 解密通过 private key 将加密信息解密，并生成 kubernetes 能识别的 secret 资源，最终被应用程序所使用。


[^1]: Git Hooks 是一种在特定 Git 操作发生前或发生后运行自定义脚本的机制
[^2]: 非对称加密原理可以回顾本书 2.5.1节《理解 HTTPS 流程》内容
