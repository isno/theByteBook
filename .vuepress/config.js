import { defineUserConfig, defaultTheme } from 'vuepress';

import { mdEnhancePlugin } from "vuepress-plugin-md-enhance";
import { commentPlugin } from "vuepress-plugin-comment2";
import { readingTimePlugin } from "vuepress-plugin-reading-time2";
//import { webpackBundler } from '@vuepress/bundler-webpack'

import { containerPlugin } from '@vuepress/plugin-container'

export default defineUserConfig({
    lang: 'zh-CN',
    title: '深入高可用架构原理与实践',
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
    ]/*,
    bundler: webpackBundler({
        postcss: {},
        vue: {},
      })*/,
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
                text: '第二章：构建“足够快”的网络服务',
                link: "/http/summary.md",
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/network/latency.md',
                    '/http/latency.md',
                    {
                        text: '2.3 域名解析的原理与实践',
                        link:  '/http/dns.md',
       
                        children: [
                            '/http/dns-ha.md',
                            '/http/http-dns.md',
                        ]
                    },
                    '/http/compress.md',
                    {
                        text: '2.5 SSL 加密原理与应用实践',
                        link:  '/http/https-summary.md',
                        children: [
                            '/http/https.md',
                            '/http/ssl.md',
                            '/http/ssl-certificate.md',
                            '/http/ssl-performance-result.md'
                        ]
                    },
                    {
                        text: '2.6 网络拥塞控制原理与应用实践',
                        link:  '/http/congestion.md',
                        children: [
                            '/http/congestion-control.md',
                            '/http/bbr.md',
                            '/http/bbr-effect.md'
                        ]
                    },
                    '/http/Edge-Acceleration.md',

                    {
                        text: '2.8 QUIC 设计原理与应用实践',
                        link:  '/http/http3.md',
                        children: [
                            '/http/quic.md',
                            '/http/quic-performance.md'
                        ]
                    },
                    "/http/conclusion.md"
                ]
            },
            {
                text: '第三章：深入 Linux 内核网络',
                collapsable: true,
                link: '/network/summary.md',
                sidebarDepth: 2,
                children: [
                    '/network/network-layer.md',
                    '/network/networking.md',
                    {
                        text: '3.3 Linux 内核网络框架',
                        link: "/network/linux-kernel-networking.md",
                        children: [
                            '/network/netfilter.md',
                            '/network/iptables.md',
                            '/network/conntrack.md',
                        ]
                    },
                    {
                        text: '3.4 内核网络优化实践',
                        link: '/network/kernel-performance.md',
                        children: [
                            "/network/RSS.md",
                            "/network/netstack-performance.md"                            
                        ]
                    },
                     {
                        text: '3.5 内核旁路技术',
                        link: "/network/kernel-bypass.md",
                        children: [
                            '/network/DPDK.md',
                            '/network/XDP.md',
                            '/network/RDMA.md',
                        ]
                    },
                    {
                        text: '3.6 Linux 网络虚拟化技术',
                        link: "/network/linux-vritual-net.md",
                        children: [
                            "/network/network-namespace.md",
                            "/network/virtual-nic.md",
                            "/network/linux-bridge.md",
                            "/network/vxlan.md"
                        ]
                    },
                    
                    '/network/conclusion.md',
                ]
            },
            
            {
                text: '第四章：负载均衡技术',
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
                text: "第五章：数据一致性与分布式事务模型",
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
                            '/distributed-transaction/Saga.md'
                        ]
                    },
                    '/distributed-transaction/idempotent.md',
                    '/distributed-transaction/conclusion.md'
                ]
            },
            {
                text: '第六章：分布式共识与算法',
                collapsable: true,
                link: '/consensus/summary.md',
                sidebarDepth: 2,
                children: [
                    '/consensus/consensus.md',
                    {
                        text: "6.2 Paxos 算法",
                        link: '/consensus/Paxos.md',
                        children: [
                            '/consensus/Paxos-history.md',
                            '/consensus/Basic-Paxos.md',
                            '/consensus/Multi-Paxos.md',
                        ]
                    },
                    {
                        text: "6.3 Raft 算法",
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
                text: '第七章：容器编排技术',
                link: '/container/summary.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/container/borg-omega-k8s.md',
                    '/container/orchestration.md',
                    '/container/image.md', 
                     "/container/CRI.md",
                    "/container/storage.md",
                    "/container/container-network.md",
                    {
                        text: '7.7 资源模型与编排调度',
                        collapsable: false,
                        sidebarDepth: 1,
                        link: '/container/Resource-scheduling.md',
                        children: [
                            "/container/resource.md",
                            "/container/Qos.md",
                            "/container/kube-scheduler.md"
                        ]
                    },
                    "/container/auto-scaling.md",
                    '/container/conclusion.md',
                ]
            },
            {
                text: '第八章：服务网格技术',
                collapsable: false,
                sidebarDepth: 1,
                link: '/ServiceMesh/summary.md',
                children: [
                    '/ServiceMesh/What-is-ServiceMesh.md',
                    '/ServiceMesh/MicroService-history.md',
                    '/ServiceMesh/overview.md',
                    '/ServiceMesh/ServiceMesh-and-Kubernetes.md',
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
                        text: "9.3 遥测数据分类与应用",
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
                text: '第十章：GitOps 设计理念与落地实践',
                link: '/GitOps/summary.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/GitOps/background.md',
                    '/GitOps/what-is-GitOps.md',
                    '/GitOps/secrets-management.md',
                     {
                        text: "10.4 使用 Tekton 进行持续集成",
                        link: '/GitOps/Tekton.md',
                        children: [
                            '/GitOps/Tekton-CRD.md',
                            '/GitOps/Tekton-install.md',
                            '/GitOps/Tekton-test.md',
                            '/GitOps/Tekton-build-image.md',
                            '/GitOps/Tekton-trigger.md',

                        ]
                    },
                    '/GitOps/ArgoCD.md',
                    '/GitOps/conclusion.md',
                ]
            }
        ]
    })
});