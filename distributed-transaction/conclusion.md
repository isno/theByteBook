# 5.5 小结

本章，我们通过介绍 ACID 明确了数据一致性的定义，通过 CAP 定理揭示了一致性、可用性和分区容错性之间的权衡关系，然后进一步介绍了 CAP 定理约束下寻求平衡 BASE、TCC、SAGA 等弱一致性事务模型。同时，也补充了实施这些事务模型时必须考虑的“幂等性”原则，这是确保分布式事务即使在失败和重试的情况下也能保持数据一致性的关键。

了解了数据一致性以及分布式事务模型，相信读者们已经掌握了实现数据一致性的方案和策略，以及如何权衡选择。

参考文档：
- CAP定理的图解证明 https://mwhittaker.github.io/blog/an_illustrated_proof_of_the_cap_theorem/
- 分布式系统八大缪误 https://nighthacks.com/jag/res/Fallacies.html
- 《凤凰架构》周志明