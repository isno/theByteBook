import { defineUserConfig, defaultTheme } from 'vuepress';

import { mdEnhancePlugin } from "vuepress-plugin-md-enhance";
import { commentPlugin } from "vuepress-plugin-comment2";
import { readingTimePlugin } from "vuepress-plugin-reading-time2";

import { containerPlugin } from '@vuepress/plugin-container'

export default defineUserConfig({
    lang: 'zh-CN',
    title: '深入架构原理与实践',
    description: '构建大规模高可用的分布式系统',
    head: [
        ['link', { rel: "shortcut icon", href: "/assets/favicon.ico" }],
        ['link', { rel: "stylesheet", href: "/styles/index.css" }],

        [ 'script', {}, `
     var _hmt = _hmt || [];
   (function() {
 var hm = document.createElement("script");
              hm.src = "https://hm.baidu.com/hm.js?e84cbf587012e6a1376a6d69805d5aa2";
              var s = document.getElementsByTagName("script")[0]; 
              s.parentNode.insertBefore(hm, s);
            })(); 
     `
 ]
    ],
    plugins: [
        mdEnhancePlugin({
          // 启用脚注
          footnote: true,
          katex: true,
          sub: true,
        }),
        containerPlugin({
            type: 'center'
        }),
        containerPlugin({
            type: 'right'
        }),
       commentPlugin({
            provider: "Giscus",
            repo:"isno/thebytebook",
            repoId:"R_kgDOIKTmzQ", 
            category:"General",
            categoryId:"DIC_kwDOIKTmzc4CV4OL"
        }),
        readingTimePlugin({
        // your options
        }),
    ],
    theme: defaultTheme({
        navbar: [{
                text: '首页',
                link: '/'
            },
            {
                text: '作者',
                link: '/about.md'
            },
            {
                text: '讨论',
                link: 'https://github.com/isno/theByteBook/discussions'
            },
            {
                text: 'GitHub仓库',
                link: 'https://github.com/isno/theByteBook'
            }
        ],
        sidebar: [
            '/intro.md',
            '/noun.md',
            {
                text: '第一章：云原生技术概论',
                link: "/architecture/summary.md",
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/architecture/history.md',
                    '/architecture/background.md',
                    '/architecture/define-cloud-native.md',
                    '/architecture/target.md',
                    {
                        text: '1.5 云原生代表技术',
                        link: '/architecture/cloud-native-tech.md',
                        children: [
                            '/architecture/container.md',
                            '/architecture/MicroService.md',
                            '/architecture/ServiceMesh.md',
                            '/architecture/Immutable.md',
                            '/architecture/declarative-api.md',
                            '/architecture/devops.md',
                        ]
                    },
                    '/architecture/arc.md',
                    '/architecture/architect.md',
                    '/architecture/conclusion.md', 
                ]
            },
            {
                text: '第二章：构建”足够快“的网络服务',
                link: "/http/summary.md",
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/network/latency.md',
                    '/http/latency.md',
                    {
                        text: '2.3 域名解析环节',
                        link:  '/http/dns.md',
       
                        children: [
                            '/http/dns-ha.md',
                            '/http/http-dns.md',
                        ]
                    },
                    {
                        text: '2.4 HTTP 请求优化',
                        link:  '/http/http-performance.md',
       
                        children: [
                            '/http/compress.md',
                            '/http/protobuf.md',
                        ]
                    },
                    {
                        text: '2.5 HTTPS 原理及 SSL 优化',
                        link:  '/http/https-summary.md',
                        children: [
                            '/http/https.md',
                            '/http/ssl.md'
                        ]
                    },
                    "/http/bbr.md",
                    '/http/Edge-Acceleration.md',

                    {
                        text: '2.8 使用 QUIC 协议',
                        link:  '/http/http3.md',
                        children: [
                            '/http/quic.md',
                            '/http/quic-performance.md'
                        ]
                    },
                ]
            },
            {
                text: '第三章：Linux 内核网络',
                collapsable: true,
                link: '/network/summary.md',
                sidebarDepth: 2,
                children: [
                    '/network/networking.md',
                    {
                        text: '3.2 Linux 内核网络框架',
                        link: "/network/linux-kernel-networking.md",
                        children: [
                            '/network/netfilter.md',
                            '/network/conntrack.md',
                            '/network/XDP.md',
                        ]
                    },
                    "/container/linux-vnet.md",
                    {
                        text: '3.3 内核参数优化实践',
                        link: '/network/kernel-performance.md',
                        children: [
                            "/network/RSS.md",
                            "/network/netstack-performance.md",
                            '/network/kernel-bypass.md',
                        ]
                    },
                    '/network/conclusion.md',
                ]
            },
            
            {
                text: '第四章：负载均衡概论',
                link: '/balance/summary.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                '/balance/balance.md',
                '/balance/balance-topology.md',
                {
                    text: "4.3 四层负载均衡",
                    link: '/balance/balance4.md',
                    children: [
                        '/balance/balance4-principle.md',
                        '/balance/balance4-ha.md',
                        '/balance/balance4-conclusion.md',    
                    ]
                },
                {
                    text: "4.4 七层负载均衡",
                    link: '/balance/balance7.md',
                    children: [
                        '/balance/nginx-conf.md',
                        '/balance/balancer7-feature.md',
                    ]
                },
                '/balance/balance-algorithm.md',
                '/balance/conclusion.md',
                ]
            },
            {
                text: "第五章：分布式事务",
                link: '/distributed-transaction/summary.md',
                children: [
                    '/distributed-transaction/ACID.md',
                    '/distributed-transaction/CAP.md',       
                    {
                        text: "5.3 分布式事务模型",
                        link: '/distributed-transaction/transaction.md',
                        children: [
                            '/distributed-transaction/BASE.md',
                            '/distributed-transaction/TCC.md',
                            '/distributed-transaction/Saga.md',
                            '/distributed-transaction/idempotent.md',
                        ]
                    },
                    '/distributed-transaction/conclusion.md'
                ]
            },
            {
                text: '第六章：分布式共识',
                collapsable: true,
                link: '/consensus/summary.md',
                sidebarDepth: 2,
                children: [
                    '/consensus/consensus.md',
                    '/consensus/The-Byzantine-General-Problem.md',
                    {
                        text: "6.3 Paxos 算法",
                        link: '/consensus/Paxos.md',
                        children: [
                            '/consensus/Paxos-history.md',
                            '/consensus/Basic-Paxos.md',
                            '/consensus/Multi-Paxos.md',
                        ]
                    },
                    {
                        text: "6.4 Raft 算法",
                        link: '/consensus/Raft.md',
                        children: [
                            '/consensus/raft-leader-election.md',
                            '/consensus/raft-log-replication.md',
                            '/consensus/raft-ConfChange.md',
                        ]
                    },
                    '/consensus/conclusion.md',
                ]
            },
            {
                text: '第七章：容器技术概论',
                link: '/container/summary.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/container/Container-Orchestration-Wars.md',
                    '/container/API.md',
                    '/container/orchestration.md',
                    '/container/image.md',
                    '/container/runtime.md',
                    {
                        text: '7.5 容器间网络',
                        link: '/container/network.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                           "/container/linux-vnet.md",
                           "/container/container-network.md" 
                        ]
                    },
                    '/container/resource-limit.md',
                    '/container/auto-scaling.md',
                    {
                        text: '7.9 生产级kubernetes部署实践',
                        link:'/container/k8s-deploy.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/container/k8s-deploy-prepare.md',
                            '/container/k8s-deploy-tls.md',
                             '/container/k8s-deploy-etcd.md',
                            '/container/k8s-deploy-containerd.md',
                            '/container/k8s-deploy-cilium.md',
                        ]
                    },
                    '/container/conclusion.md',
                ]
            },
            {
                text: '第八章：服务网格概论',
                collapsable: false,
                sidebarDepth: 1,
                link: '/ServiceMesh/summary.md',
                children: [
                    '/ServiceMesh/What-is-ServiceMesh.md',
                    '/ServiceMesh/MicroService-history.md',
                    '/ServiceMesh/ServiceMesh-and-Kubernetes.md',
                    '/ServiceMesh/overview.md',
                    '/ServiceMesh/The-future-of-ServiceMesh.md',
                    '/ServiceMesh/conclusion.md',
                ]
            },
             {
                text: '第九章：系统可观测性',
                link: '/observability/summary.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    "/observability/What-is-Observability.md",
                    "/observability/Observability-vs-Monitoring.md",
                    {
                        text: "9.2 遥测数据分类",
                        link: '/observability/signals.md',
                        children: [
                            '/observability/metrics.md',
                            '/observability/logging.md',
                            '/observability/tracing.md',
                            '/observability/profiles.md',
                            '/observability/dumps.md',
                        ]
                    },
                    '/observability/OpenTelemetry.md',
                    '/observability/conclusion.md',
                ]
            },
            {
                text: '第十章：GitOps 的落地实践',
                link: '/GitOps/summary.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/GitOps/what-is-GitOps.md',
                    '/GitOps/AoneFlow.md',
                    '/GitOps/CICD.md',
                    {
                        text: "持续集成",
                        link: '/GitOps/CI.md',
                        children: [
                            '/GitOps/container-image-build.md',
                            '/GitOps/SonarQube.md',
                        ]
                    },
                    {
                        text: "持续交付",
                        link: '/GitOps/CD.md',
                        children: [                         
                           '/GitOps/ArgoCD.md',
                           '/GitOps/Flagger.md'
                        ]
                    },
                ]
            }
        ]
    })
});