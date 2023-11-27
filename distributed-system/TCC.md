# 5.3.2 TCC

TCC 是“Try-Confirm-Cancel”三个单词的缩写，最早出现在 2007 年数据库专家 Pat Helland 发表了一篇名为 “Life beyond Distributed Transactions:an Apostate’s Opinion” 的论文中[^1]，不过该论文中 TCC 还是以 Tentative-Confirmation-Cancellation 作为名称，在国内经历阿里程立博士的传道之后，TCC 逐渐被大家广为了解并接受。


如果你的业务需要隔离，那就应该重点考虑 TCC 方案，该方案天生适合用于需要强隔离性的分布式事务中。


TCC 是一种基于补偿事务的分布式事务模型。

:::tip 补偿机制
补偿机制指的是：在分布式事务出现异常时，通过一系列的操作，尽可能使得分布式事务状态回滚到之前的状态，从而避免分布式事务产生不一致的情况。
:::

核心思想是**针对每个操作都要注册一个与其对应的确认（Try）和补偿（Cancel）**。如同名字，TCC 整个事务流程由三个阶段组成：

- **Try 阶段**：尝试执行，完成所有业务检查（一致性）, 预留必须业务资源（准隔离性）。
- **Confirm 阶段**：如果所有分支的Try都成功了，则走到Confirm阶段。Confirm真正执行业务，不作任何业务检查，只使用 Try 阶段预留的业务资源。
- **Cancel 阶段**：如果所有分支的Try有一个失败了，则走到Cancel阶段。Cancel释放 Try 阶段预留的业务资源。

按照 TCC 的协议，Confirm 和 Cancel 是只返回成功，不会返回失败。如果由于网络问题，或者服务器临时故障，那么事务管理器会进行重试，最终成功。


以一个下单服务为例，说明 TCC 事务处理流。该下单服务由两个系统操作完成：订单系统 X、资金账户系统 Y。

<div  align="center">
	<img src="../assets/tcc.png" width = "550"  align=center />
</div>

- **Try 操作** : try X 下单系统创建待支付订单。try Y 自己账户系统冻结订单金额 100 元。 
- **Confirm 操作**  confirm X 订单更新为支付成功。confirm Y 扣减账户系统 100 元。
- **Cancel 操作** Cancel X 订单异常，资金退回，Cancel Y 扣款异常，订单支付失败


由上述操作过程可见，TCC 其实有点类似 2PC 的准备阶段和提交阶段，但 TCC 是位于用户代码层面，而不是在基础设施层面，这为它的实现带来了较高的灵活性，可以根据需要设计资源锁定的粒度。

TCC 事务模型虽然说起来简单，然而要基于 TCC 实现一个通用的分布式事务框架，却比它看上去要复杂的多，感知各个阶段的执行情况以及推进执行下一个阶段需要编写大量的逻辑代码，不只是调用一下 Confirm/Cancel 那么简单。通常的情况，我们不需要靠裸编码来实现 TCC，而是引入某些分布式事务中间件（譬如 Seata、ByteTCC）来降低编码工作，提升开发效率。

[^1]: 参见 http://adrianmarriott.net/logosroot/papers/LifeBeyondTxns.pdf