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
            text: '网络原理与优化指南',
            collapsable: false,
            children: [
                '/content/chapter1/intro.md',
                '/content/chapter1/wireless.md',
                '/content/chapter1/latency.md',
                '/content/chapter1/netfilter.md',
            ]
        }]
    })
});