import type { Organization, Membership, Repository, Workflow } from "@/types";
const now = new Date();
const dAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const mAgo = (n: number) => new Date(now.getTime() - n * 60000);
const hAgo = (n: number) => new Date(now.getTime() - n * 3600000);

export const demoUser = {
  id: "usr_demo_001",
  name: "Everton Andrade",
  email: "everton@releasesignal.dev",
  githubId: "everton-andrade",
  createdAt: dAgo(180),
};

export const demoOrg: Organization = {
  id: "org_demo_001",
  name: "Acme Engineering",
  slug: "acme-engineering",
  plan: "custom",
  createdAt: dAgo(180),
  settings: {
    timezone: "America/Sao_Paulo",
    defaultBranch: "main",
    qualityGateRequired: true,
    aiEnabled: true,
    dataRetentionDays: 90,
  },
};

export const demoMembers: Membership[] = [
  {
    id: "mem_1",
    userId: "usr_demo_001",
    organizationId: "org_demo_001",
    role: "owner",
    user: {
      id: "usr_demo_001",
      name: "Everton Andrade",
      email: "everton@releasesignal.dev",
      createdAt: dAgo(180),
    },
  },
  {
    id: "mem_2",
    userId: "usr_2",
    organizationId: "org_demo_001",
    role: "admin",
    user: { id: "usr_2", name: "Sarah Chen", email: "sarah@acme.dev", createdAt: dAgo(120) },
  },
  {
    id: "mem_3",
    userId: "usr_3",
    organizationId: "org_demo_001",
    role: "member",
    user: { id: "usr_3", name: "Marcus Johnson", email: "marcus@acme.dev", createdAt: dAgo(90) },
  },
  {
    id: "mem_4",
    userId: "usr_4",
    organizationId: "org_demo_001",
    role: "member",
    user: { id: "usr_4", name: "Priya Patel", email: "priya@acme.dev", createdAt: dAgo(60) },
  },
  {
    id: "mem_5",
    userId: "usr_5",
    organizationId: "org_demo_001",
    role: "viewer",
    user: { id: "usr_5", name: "Tom Wilson", email: "tom@acme.dev", createdAt: dAgo(30) },
  },
];

export const demoRepos: Repository[] = [
  {
    id: "repo_1",
    organizationId: "org_demo_001",
    name: "acme-web",
    fullName: "acme-engineering/acme-web",
    defaultBranch: "main",
    language: "TypeScript",
    connected: true,
    integrationStatus: "connected",
    lastSyncAt: mAgo(5),
  },
  {
    id: "repo_2",
    organizationId: "org_demo_001",
    name: "acme-api",
    fullName: "acme-engineering/acme-api",
    defaultBranch: "main",
    language: "TypeScript",
    connected: true,
    integrationStatus: "connected",
    lastSyncAt: mAgo(12),
  },
  {
    id: "repo_3",
    organizationId: "org_demo_001",
    name: "acme-mobile",
    fullName: "acme-engineering/acme-mobile",
    defaultBranch: "main",
    language: "TypeScript",
    connected: true,
    integrationStatus: "connected",
    lastSyncAt: hAgo(1),
  },
  {
    id: "repo_4",
    organizationId: "org_demo_001",
    name: "acme-infra",
    fullName: "acme-engineering/acme-infra",
    defaultBranch: "main",
    language: "TypeScript",
    connected: true,
    integrationStatus: "connected",
    lastSyncAt: hAgo(2),
  },
  {
    id: "repo_5",
    organizationId: "org_demo_001",
    name: "acme-design-system",
    fullName: "acme-engineering/acme-design-system",
    defaultBranch: "main",
    language: "TypeScript",
    connected: true,
    integrationStatus: "connected",
    lastSyncAt: hAgo(3),
  },
  {
    id: "repo_6",
    organizationId: "org_demo_001",
    name: "acme-docs",
    fullName: "acme-engineering/acme-docs",
    defaultBranch: "main",
    language: "MDX",
    connected: false,
    integrationStatus: "disconnected",
  },
  {
    id: "repo_7",
    organizationId: "org_demo_001",
    name: "acme-analytics",
    fullName: "acme-engineering/acme-analytics",
    defaultBranch: "main",
    language: "Python",
    connected: true,
    integrationStatus: "error",
    lastSyncAt: dAgo(2),
  },
  {
    id: "repo_8",
    organizationId: "org_demo_001",
    name: "acme-payments",
    fullName: "acme-engineering/acme-payments",
    defaultBranch: "main",
    language: "TypeScript",
    connected: true,
    integrationStatus: "connected",
    lastSyncAt: mAgo(30),
  },
];

export const demoWorkflows: Workflow[] = [
  {
    id: "wf_1",
    repositoryId: "repo_1",
    name: "E2E Tests (Playwright)",
    path: ".github/workflows/e2e.yml",
    enabled: true,
  },
  {
    id: "wf_2",
    repositoryId: "repo_1",
    name: "Unit Tests",
    path: ".github/workflows/unit.yml",
    enabled: true,
  },
  {
    id: "wf_3",
    repositoryId: "repo_2",
    name: "API Integration Tests",
    path: ".github/workflows/api-tests.yml",
    enabled: true,
  },
  {
    id: "wf_4",
    repositoryId: "repo_2",
    name: "Contract Tests",
    path: ".github/workflows/contract.yml",
    enabled: true,
  },
  {
    id: "wf_5",
    repositoryId: "repo_3",
    name: "Mobile E2E",
    path: ".github/workflows/mobile-e2e.yml",
    enabled: true,
  },
  {
    id: "wf_6",
    repositoryId: "repo_8",
    name: "Payment Flow Tests",
    path: ".github/workflows/payment-tests.yml",
    enabled: true,
  },
];
