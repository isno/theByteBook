import { defineUserConfig, defaultTheme } from 'vuepress';

export default defineUserConfig({
    lang: 'zh-CN',
    title: '深入架构原理与实践',
    description: '高可用服务体系原理与实践',
    head: [
        ['link', { rel: "shortcut icon", href: "/assets/favicon.ico" }],
    ],
    theme: defaultTheme({
        navbar: [{
                text: '首页',
                link: '/'
            },
            {
                text: 'GitHub仓库',
                link: 'https://github.com/isno/theByteBook'
            }
        ],
        sidebar: [{
            text: 'underlay网络',
            collapsable: false,
            sidebarDepth: 1,
            children: [{
                    text: "理解篇",
                    path: '/content/chapter1/intro.md',
                    children: [
                        '/content/chapter1/latency.md',
                        '/content/chapter1/bgp.md',
                        '/content/chapter1/congestion-control.md',
                        '/content/chapter1/netfilter.md',
                        '/content/chapter1/overlay.md'
                    ]
                },
                {
                    text: "观测篇",
                    children: [
                        '/content/chapter1/net-observe.md',
                        '/content/chapter1/mtr.md'
                    ]
                }
            ]
        },
        {
            text: '优化网络性能',
            collapsable: false,
            sidebarDepth: 1,
            children: [
                '/content/http/latency.md',
                '/content/http/http-dns.md'
            ]}

        ]
    })
});