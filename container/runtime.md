# 7.4 容器运行时：从 Docker 到 CRI

Docker 大概也没想到，在孕育 Docker 的母公司倒闭的 8 年之后还能再次成为舆论的焦点[^1]，事件的起源是 Kubernetes 宣布开始进入废弃 dockershim 支持的倒计时，最后讹传讹被人误以为 Docker 不能再用了。虽说此次事件有众多标题党的推波助澜，但也侧面说明了 Kubernetes 与 Docker 两者的关系十分微妙。

本节，我们把握这两者关系的变化，从中理解容器运行时规范以及 Kubernetes CRI 容器运行时接口的演变。

[^1]: 孕育 Docker 的公司最初叫 dotCloud，后来更改为 Docker Inc。Docker 为了更好的专注于容器研究，2014 年 8 月，Docker Inc 将 PaaS 业务 dotCloud 出售给德国一家 PaaS 服务厂商 CloudControl。2016 年 2 月，dotCloud 的母公司 cloudControl 宣布破产。
