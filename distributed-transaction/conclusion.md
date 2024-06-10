# 5.4 小结

本章，我们介绍 ACID 明确了数据一致性的定义，通过 CAP 定理揭示了一致性、可用性和分区容错性之间的权衡关系。并进一步介绍了 CAP 定理约束下寻求平衡 BASE、TCC、SAGA 等弱一致性事务模型。同时，也补充了实施这些事务模型时必须考虑的“幂等性”原则，这是确保分布式事务即使在失败和重试的情况下也能保持数据一致性的关键。

通过本章，相信读者们已经理解设计和实施健壮分布式事务所需的方案和策略，以及掌握这些方案的权衡选择的能力。

参考文档

- CAP定理的图解证明 https://mwhittaker.github.io/blog/an_illustrated_proof_of_the_cap_theorem/
- 分布式系统八大缪误 https://nighthacks.com/jag/res/Fallacies.html
- 《凤凰架构》周志明