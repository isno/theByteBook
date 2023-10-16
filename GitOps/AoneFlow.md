# 分支管理模型 Aone Flow

为满足各类场景开发需求，我们可以在 Git 中定义不同用途的分支以及分支的合并策略，这就是分支模型。

常用的 Git 分支模型有 Gitflow、主干开发模型、Aone Flow 等分支管理方法。

||Gitflow| 主干开发 | Aone Flow|
|:--|:--|:--|:--|
| 代表公司 | Git Prime | Google| 阿里 |
| 使用场景| 瀑布式| 持续交付| 持续交付 |
|操作复杂度| 中等| 简单| 复杂（需要系统自动化）|
|并行开发| 支持| 支持|支持|
| 下线特性分支| 手动| 手动| 可自动化|
| 随时发布 | 不支持| 支持（开关隔离）| 支持|
 
Aone Flow 定义了三种分支类型 - 特性分支(feature)、发布分支(release)与主干分支(Master)。

开发人员在收到开发任务后，会从 Master 分支拉取专用的 feature 分支。在 feature 分支完成开发工作后，将 feature 并入 release 分支进行集成测试。 测试人员发布分支并完成测试工作后，由开发或运维人员将 release 分支部署到正式环境，然后再将 release 分支合并进入 Master 分支。


以图为例，开发人员 A 与 开发人员 B 收到两个开发任务后，分别创建特性分支 feature/001，feature/002，并进入开发工作。开发工作完成后，他们需要将 feature/001 feature/002 发布到日常环境进行集成测试。于是创建一个发布分支 release/daily，并将 feature/001 feature/002 合并到该分支中。

feature/001 通过了测试，但 feature/002 还存在较多 bug，此时 feature/001 可以独立发布到正式环境。为了避免 feature/002 对测试造成干扰，我们需要将 feature/002 解除合并，单独对 feature/001 进行回归验证。

由于 Git 中去除一个已经合并分支所有的提交较为繁琐，我们可以重新创建一个日常环境的 release 分支，仅合并待测试的 feature/001 分支，为了避免与旧 release 分支名字冲突，我们可以采用 release/20220304 此类的日期分类方式。