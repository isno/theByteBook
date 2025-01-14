# 10.3.4 OAM

2019 年 10 月，阿里云与微软在上海 QCon 大会上联合发布了全球首个开放应用模型（OAM，Open Application Model）。OAM 的核心理念是通过模块化设计，将应用拆解为多个功能单元，从而实现开发、运维和平台人员之间的关注点分离。开发人员专注于业务逻辑的实现，运维人员关注程序的稳定性，而平台人员则致力于提升基础设施的能力与可靠性。

OAM 规范下的应用模型并非纯粹的抽象概念，是可以被实际使用的自定义资源。（v0.3.0）这些概念的具体含义如下：

- **应用组件（Component）**：无论是前端还是后端，组件化构建应用的思想屡见不鲜。平台架构师将应用分解成成一个个可被复用的模块、每个组件都具有明确的功能和接口，开发人员通过配置文件填写组件参数、与其他服务的关系，就能描绘出一个完整的应用。
- **运维特征（Trait）**：运维特征是可以随时绑定给待部署组件的模块化、可拔插的运维能力，比如：副本数调整、数据持久化、设置网关策略、自动设置 DNS 解析等。用户可以从社区获取成熟的能力，也可以自行定义。
- **应用边界（Application Scope）**：描述集群范围内或应用范围内的行为控制，它定义了与运行时状态、资源利用或安全等相关的约束条件。例如，Policy 可以用来控制副本数量、资源限制、访问控制等。
- **Workflow**：定义组件如何运行，包含了组件的资源配额和相关的配置。这通常会被映射到 Kubernetes 中的资源对象（如 Pod、Deployment、StatefulSet）上。

:::center
  ![](../assets/OAM-how-it-works.png)<br/>
  图 4-0 OAM 应用部署计划
:::

通过组件（Component）和运维特征（Trait）将业务研发人员与运维人员关注的不同特征进行分离，再将不同的运维特征（Trait）与业务组件（Component）进行绑定，最终再由 OAM 可交付物 – Application Configuration 组装为一个统一的应用。对于一个应用而言，大家只需要一份 OAM 的这种自包含的应用描述文件，完整地跟踪到一个软件运行所需要的所有资源和依赖。

```
apiVersion: core.oam.dev/v1beta1
kind: ApplicationConfiguration
metadata:
  name: my-app-config
spec:
  components:
    - componentName: web-server
      traits:
        - trait:
            apiVersion: core.oam.dev/v1alpha2
            kind: ManualScalerTrait
            metadata:
              name: web-server-scaler
            spec:
              replicaCount: 3
    - componentName: database
      traits:
        - trait:
            apiVersion: core.oam.dev/v1alpha2
            kind: SidecarTrait
            metadata:
              name: database-sidecar
            spec:
              containers:
                - name: backup-agent
                  image: backup/agent:latest
                  resources:
                    limits:
                      cpu: "0.5"
                      memory: "128Mi"
```
把这样的”高级抽象“交给 OAM 规范实现（如 KubeVela），它将其转换为 Kubernetes 底层资源（如 Deployment、Service 等），就可以快速、在不同运行环境上把应用随时运行起来！

KubeVela 可以看做是 OAM 规范的 Kubernetes 解释器，它于 2020 年 11 月发布正式对外开源，2021 年 4 月发布了 v1.0，2021 年 6 月加入 CNCF 成为沙箱项目。该项目的贡献者来自世界各地，有超过 260 多名贡献者，包括招商银行、滴滴、京东、极狐 GitLab、SHEIN 等。


[^1]: https://zh.wikipedia.org/wiki/%E4%BF%A1%E6%81%AF%E7%83%9F%E5%9B%B1