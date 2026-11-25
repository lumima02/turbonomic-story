// All copy and links live here, so edits never touch layout code.
// Source: Figma "05 Hi-fi Prototype v2" (snapshot 2026-11-16).

export const DEMO_URL = 'https://demo-now.techzone.ibm.com/psl/gvi0r5c'; // Turbonomic product tour (IBM TechZone)
export const CASE_STUDIES = {
  Atruvia: 'https://www.ibm.com/case-studies/atruvia-turbonomic',
  Metzler: 'https://www.ibm.com/case-studies/metzler'
};

// 3D renders: put Blender images in /public/renders and add `render: 'renders/scene-01.png'`
// to a scene (or to a trade-off option). That scene then shows the image instead of the
// animated blocks; scenes without a render keep the blocks.
export const SCENES = [
  {
    id: 'banking',
    eyebrow: 'Banking and financial markets',
    headline: 'Markets don’t wait. Neither do your clients.',
    body: 'A stalled payment or a lagging trading platform puts revenue and client trust at risk. For financial services firms, a high-impact outage costs an average of $1.8 million an hour.¹',
    footnote: '¹ New Relic, financial services outage research, January 2026',
    footnoteUrl: 'https://newrelic.com/press-release/20260120',
    stageLabel: 'A balanced cluster of healthy infrastructure blocks floating above a base plate.'
  },
  {
    id: 'problem',
    eyebrow: 'The problem',
    headline: 'Some resources sit idle while others are overwhelmed.',
    body: 'Infrastructure is sized for peaks like market open, month-end close, and payday, then sits idle the rest of the time. Organizations estimate 29% of their cloud infrastructure spend is wasted.²',
    footnote: '² Flexera 2026 State of the Cloud Report (IaaS and PaaS spend)',
    footnoteUrl: 'https://www.flexera.com/about-us/press-center/flexera-finds-cloud-value-is-rising-while-ai-waste-grows',
    tags: [
      { label: '3 oversized', status: 'warning' },
      { label: '2 congested', status: 'error' },
      { label: '4 healthy', status: 'success' }
    ],
    tips: {
      idle: 'Idle: a reporting server sized for quarter-end, unused most of the month',
      pressure: 'Under pressure: the payments service is running out of memory during payday volume'
    },
    stageLabel: 'Three blocks are oversized and yellow, two are congested and red, and four are healthy.'
  },
  {
    id: 'trade-off',
    eyebrow: 'The trade-off',
    headline: 'Without real-time insight, every choice is a trade-off.',
    options: [
      { name: 'safe', label: 'Play it safe', body: 'Overprovision everything to protect client-facing services. Performance holds, but infrastructure costs keep climbing.', cost: 90, risk: 20,
        stageLabel: 'Extra oversized blocks are stacked across the plate.' },
      { name: 'cut', label: 'Cut costs', body: 'Trim capacity to meet budget targets. Costs drop until trading volume spikes and transactions slow down.', cost: 30, risk: 85,
        stageLabel: 'Blocks are removed and most of the remaining ones are congested.' },
      { name: 'balance', label: 'Use Turbonomic', body: 'Match resources to demand in real time. Performance holds through market open and month-end, and idle capacity stops adding to the bill.', cost: 35, risk: 15,
        stageLabel: 'Every block is healthy and right-sized.', bridge: 'Here’s how it works.' }
    ],
    bridge: 'There’s a third option.',   // an option's own bridge replaces this
    footnote: 'Cost and risk bars are illustrative.'
  },
  {
    id: 'visibility',
    eyebrow: 'Full-stack visibility',
    headline: 'Turbonomic sees the whole picture.',
    body: 'It maps how every application, from core banking to mobile apps, depends on the infrastructure beneath it. That’s the visibility regulations like the EU’s Digital Operational Resilience Act now expect.',
    footnote: 'Supply chain counts are illustrative.',
    supplyChain: [
      { label: 'Business application', count: 12, segs: [['green', 0.75], ['yellow', 0.25]] },
      { label: 'Application component', count: 48, segs: [['green', 0.7], ['yellow', 0.2], ['red', 0.1]] },
      { label: 'Virtual machine', count: 320, segs: [['green', 0.55], ['yellow', 0.3], ['red', 0.15]] },
      { label: 'Host', count: 24, segs: [['green', 0.6], ['yellow', 0.15], ['red', 0.25]] },
      { label: 'Storage', count: 16, segs: [['green', 0.8], ['yellow', 0.2]] }
    ],
    platforms: ['VMware vSphere', 'Red Hat OpenShift', 'Kubernetes', 'AWS', 'Microsoft Azure', 'Google Cloud', 'IBM Cloud'],
    stageLabel: 'The stack separates into applications, compute, and storage layers while a scan connects them.'
  },
  {
    id: 'automation',
    eyebrow: 'Intelligent automation',
    headline: 'Then it acts, safely and automatically.',
    body: 'Turbonomic doesn’t stop at recommendations. It executes changes within the policies your team sets and keeps an auditable record of every action.',
    actions: [
      { id: 'payments', title: 'Give the payments service more memory', detail: 'Resize up · payments-api-vm · VMem 8 GB → 12 GB', category: 'Performance', done: false, cell: 8,
        why: 'Memory use peaked at 94% during payday volume, and the service started swapping.' },
      { id: 'risk', title: 'Move risk analytics to a quieter host', detail: 'Move · risk-analytics-vm · host-03 → host-07', category: 'Performance', done: false, cell: 3,
        why: 'host-03 is contended at market open, which slows risk models; host-07 has headroom.' },
      { id: 'reporting', title: 'Trim an oversized quarter-end reporting server', detail: 'Resize down · reporting-vm · 8 vCPU → 4 vCPU', category: 'Efficiency', done: false, cell: 5,
        why: 'CPU use has stayed under 10% for 30 days outside quarter-end.' }
    ],
    // How teams adopt automation at their own pace. The highlighted step follows the demo: Recommend until an action
    // is executed, Approve once one is, Automate when the toggle is on.
    control: [
      { label: 'Recommend', text: 'Review every action first' },
      { label: 'Approve', text: 'Run them by hand or via ServiceNow' },
      { label: 'Automate', text: 'Policies run the ones you trust' }
    ],
    quote: {
      text: 'With Turbonomic in automation, managing our environment has become completely effortless.',
      name: 'Thomas Maag',
      role: 'Infrastructure Engineer, Metzler'
    },
    stageLabel: 'Blocks resize and move toward balance as each action is executed.'
  },
  {
    id: 'results',
    eyebrow: 'Proven results',
    headline: 'Applications stay fast. Spending matches what you use.',
    body: 'Resources follow demand in real time, so performance holds through market open and month-end close, and idle capacity is reclaimed.',
    stats: [
      { value: '20%', label: 'smaller server footprint in 18 months', source: 'Atruvia' },
      { value: '10%', label: 'VM growth absorbed with no new hardware', source: 'Metzler' },
      { value: '1,000+', label: 'servers decommissioned without affecting availability', source: 'Atruvia', small: true }
    ],
    footnoteNearContent: true,   // sits just under the case study links instead of at the foot of the screen
    footnote: 'Atruvia is the IT provider for Germany’s cooperative banks, serving 91 million bank accounts. Metzler is a Frankfurt-based bank with more than 340 years in financial services.',
    stageLabel: 'A before and after comparison: imbalanced blocks on one side, a fully healthy cluster on the other.'
  },
  {
    id: 'next-steps',
    eyebrow: 'Next steps',
    headline: 'See what Turbonomic would find in your environment.',
    body: 'Explore a self-guided product tour and watch Turbonomic assure performance and control costs across hybrid infrastructure. No sign-up needed.',
    audiences: [
      { role: 'IT operations', text: 'Fewer performance incidents to firefight' },
      { role: 'FinOps and finance', text: 'Spend that tracks real demand' },
      { role: 'Application owners', text: 'Performance that holds at peak' }
    ],
    share: {
      label: 'Turbonomic product story',
      heading: 'Share this page',
      body: 'Send this overview to colleagues who weren’t in the meeting, like finance, procurement, or your CIO.',
      toastTitle: 'Link copied',
      toastBody: 'Paste it into an email or chat to share this page.'
    },
    stageLabel: 'The balanced cluster lifts off the plate and floats again.'
  }
];
