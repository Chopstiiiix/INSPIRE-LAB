import { PrismaClient, UserRole, UserStatus, SkillLevel, ToolLevel, ProjectStatus, Visibility } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...\n");

  // ============================================================================
  // 1. CREATE ADMIN USER
  // ============================================================================
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@inspire-lab.app" },
    update: {},
    create: {
      email: "admin@inspire-lab.app",
      password: adminPassword,
      name: "Admin User",
      handle: "admin",
      roleTitle: "Platform Administrator",
      bio: "INSPIRE-LAB admin account",
      status: UserStatus.ACTIVE,
      role: UserRole.ADMIN,
      emailVerified: new Date(),
    },
  });
  console.log("✅ Created admin user:", admin.email);

  // ============================================================================
  // 2. CREATE SKILL TAGS
  // ============================================================================
  const skillTags = [
    { name: "JavaScript", slug: "javascript", category: "Programming Languages" },
    { name: "TypeScript", slug: "typescript", category: "Programming Languages" },
    { name: "Python", slug: "python", category: "Programming Languages" },
    { name: "Go", slug: "go", category: "Programming Languages" },
    { name: "Rust", slug: "rust", category: "Programming Languages" },
    { name: "Java", slug: "java", category: "Programming Languages" },

    { name: "React", slug: "react", category: "Frontend Frameworks" },
    { name: "Vue.js", slug: "vuejs", category: "Frontend Frameworks" },
    { name: "Angular", slug: "angular", category: "Frontend Frameworks" },
    { name: "Svelte", slug: "svelte", category: "Frontend Frameworks" },

    { name: "Node.js", slug: "nodejs", category: "Backend Frameworks" },
    { name: "Express", slug: "express", category: "Backend Frameworks" },
    { name: "Next.js", slug: "nextjs", category: "Full-Stack Frameworks" },
    { name: "Django", slug: "django", category: "Backend Frameworks" },
    { name: "FastAPI", slug: "fastapi", category: "Backend Frameworks" },
    { name: "Ruby on Rails", slug: "rails", category: "Backend Frameworks" },

    { name: "PostgreSQL", slug: "postgresql", category: "Databases" },
    { name: "MongoDB", slug: "mongodb", category: "Databases" },
    { name: "Redis", slug: "redis", category: "Databases" },
    { name: "MySQL", slug: "mysql", category: "Databases" },

    { name: "Docker", slug: "docker", category: "DevOps" },
    { name: "Kubernetes", slug: "kubernetes", category: "DevOps" },
    { name: "AWS", slug: "aws", category: "Cloud Platforms" },
    { name: "GCP", slug: "gcp", category: "Cloud Platforms" },
    { name: "Azure", slug: "azure", category: "Cloud Platforms" },

    { name: "Machine Learning", slug: "machine-learning", category: "AI/ML" },
    { name: "Deep Learning", slug: "deep-learning", category: "AI/ML" },
    { name: "Natural Language Processing", slug: "nlp", category: "AI/ML" },
    { name: "Computer Vision", slug: "computer-vision", category: "AI/ML" },

    { name: "UI/UX Design", slug: "ui-ux-design", category: "Design" },
    { name: "Product Management", slug: "product-management", category: "Business" },
    { name: "Agile/Scrum", slug: "agile-scrum", category: "Methodologies" },
    { name: "System Design", slug: "system-design", category: "Architecture" },
  ];

  const createdSkillTags = [];
  for (const tag of skillTags) {
    const skillTag = await prisma.skillTag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
    createdSkillTags.push(skillTag);
  }
  console.log(`✅ Created ${createdSkillTags.length} skill tags`);

  // ============================================================================
  // 3. CREATE TOOL TAGS
  // ============================================================================
  const toolTags = [
    { name: "VS Code", slug: "vscode", category: "IDEs & Editors" },
    { name: "IntelliJ IDEA", slug: "intellij", category: "IDEs & Editors" },
    { name: "Vim", slug: "vim", category: "IDEs & Editors" },
    { name: "Cursor", slug: "cursor", category: "IDEs & Editors" },

    { name: "Git", slug: "git", category: "Version Control" },
    { name: "GitHub", slug: "github", category: "Version Control" },
    { name: "GitLab", slug: "gitlab", category: "Version Control" },

    { name: "Figma", slug: "figma", category: "Design Tools" },
    { name: "Sketch", slug: "sketch", category: "Design Tools" },
    { name: "Adobe XD", slug: "adobe-xd", category: "Design Tools" },

    { name: "Jira", slug: "jira", category: "Project Management" },
    { name: "Linear", slug: "linear", category: "Project Management" },
    { name: "Notion", slug: "notion", category: "Productivity" },
    { name: "Slack", slug: "slack", category: "Communication" },

    { name: "Postman", slug: "postman", category: "API Development" },
    { name: "Insomnia", slug: "insomnia", category: "API Development" },

    { name: "Prisma", slug: "prisma", category: "ORMs" },
    { name: "Drizzle", slug: "drizzle", category: "ORMs" },
    { name: "TypeORM", slug: "typeorm", category: "ORMs" },

    { name: "Terraform", slug: "terraform", category: "Infrastructure as Code" },
    { name: "Ansible", slug: "ansible", category: "Infrastructure as Code" },

    { name: "Jest", slug: "jest", category: "Testing" },
    { name: "Vitest", slug: "vitest", category: "Testing" },
    { name: "Playwright", slug: "playwright", category: "Testing" },
    { name: "Cypress", slug: "cypress", category: "Testing" },
  ];

  const createdToolTags = [];
  for (const tag of toolTags) {
    const toolTag = await prisma.toolTag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
    createdToolTags.push(toolTag);
  }
  console.log(`✅ Created ${createdToolTags.length} tool tags`);

  // ============================================================================
  // 4. CREATE INVITE CODE WITH 50 USES
  // ============================================================================
  const inviteCode = await prisma.inviteCode.upsert({
    where: { code: "WELCOME2026" },
    update: { enabled: true, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    create: {
      code: "WELCOME2026",
      maxUses: 50,
      enabled: true,
      createdById: admin.id,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });
  console.log("✅ Created invite code: WELCOME2026 (50 uses)");

  // ============================================================================
  // 5. CREATE TEST ACTIVE USERS
  // ============================================================================
  const userPassword = await bcrypt.hash("password123", 10);

  // Alice - Full-Stack Engineer
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      password: userPassword,
      name: "Alice Johnson",
      handle: "alice",
      roleTitle: "Senior Full-Stack Engineer",
      bio: "Building scalable web applications with React and Node.js. Passionate about clean code and user experience.",
      location: "San Francisco, CA",
      website: "https://alice.dev",
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      emailVerified: new Date(),
    },
  });

  // Bob - Backend Engineer
  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      password: userPassword,
      name: "Bob Smith",
      handle: "bob",
      roleTitle: "Backend Engineer",
      bio: "Specializing in distributed systems and API design. Love working with Go and PostgreSQL.",
      location: "Austin, TX",
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      emailVerified: new Date(),
    },
  });

  // Charlie - Frontend Developer
  const charlie = await prisma.user.upsert({
    where: { email: "charlie@example.com" },
    update: {},
    create: {
      email: "charlie@example.com",
      password: userPassword,
      name: "Charlie Davis",
      handle: "charlie",
      roleTitle: "Frontend Developer",
      bio: "Creating beautiful and accessible user interfaces. TypeScript and React enthusiast.",
      location: "New York, NY",
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      emailVerified: new Date(),
    },
  });

  console.log("✅ Created test users: alice, bob, charlie");

  // ============================================================================
  // 6. ADD SKILLS TO ALICE
  // ============================================================================
  const jsTag = createdSkillTags.find((t) => t.slug === "javascript");
  const tsTag = createdSkillTags.find((t) => t.slug === "typescript");
  const reactTag = createdSkillTags.find((t) => t.slug === "react");
  const nextjsTag = createdSkillTags.find((t) => t.slug === "nextjs");
  const nodejsTag = createdSkillTags.find((t) => t.slug === "nodejs");
  const postgresTag = createdSkillTags.find((t) => t.slug === "postgresql");

  if (jsTag && tsTag && reactTag && nextjsTag && nodejsTag && postgresTag) {
    await prisma.userSkill.createMany({
      data: [
        { userId: alice.id, skillTagId: jsTag.id, level: SkillLevel.EXPERT, featured: true, yearsOfExp: 8 },
        { userId: alice.id, skillTagId: tsTag.id, level: SkillLevel.EXPERT, featured: true, yearsOfExp: 5 },
        { userId: alice.id, skillTagId: reactTag.id, level: SkillLevel.EXPERT, featured: true, yearsOfExp: 6 },
        { userId: alice.id, skillTagId: nextjsTag.id, level: SkillLevel.ADVANCED, featured: true, yearsOfExp: 3 },
        { userId: alice.id, skillTagId: nodejsTag.id, level: SkillLevel.EXPERT, featured: false, yearsOfExp: 7 },
        { userId: alice.id, skillTagId: postgresTag.id, level: SkillLevel.ADVANCED, featured: false, yearsOfExp: 4 },
      ],
      skipDuplicates: true,
    });
    console.log("✅ Added skills to Alice");
  }

  // ============================================================================
  // 7. ADD TOOLS TO ALICE
  // ============================================================================
  const vscodeTag = createdToolTags.find((t) => t.slug === "vscode");
  const gitTag = createdToolTags.find((t) => t.slug === "git");
  const figmaTag = createdToolTags.find((t) => t.slug === "figma");
  const prismaTag = createdToolTags.find((t) => t.slug === "prisma");

  if (vscodeTag && gitTag && figmaTag && prismaTag) {
    await prisma.userTool.createMany({
      data: [
        { userId: alice.id, toolTagId: vscodeTag.id, level: ToolLevel.EXPERT, featured: true },
        { userId: alice.id, toolTagId: gitTag.id, level: ToolLevel.EXPERT, featured: true },
        { userId: alice.id, toolTagId: figmaTag.id, level: ToolLevel.INTERMEDIATE, featured: false },
        { userId: alice.id, toolTagId: prismaTag.id, level: ToolLevel.ADVANCED, featured: true },
      ],
      skipDuplicates: true,
    });
    console.log("✅ Added tools to Alice");
  }

  // ============================================================================
  // 8. ADD PROJECTS TO ALICE
  // ============================================================================
  await prisma.project.createMany({
    data: [
      {
        userId: alice.id,
        title: "E-commerce Platform",
        description: "Built a full-stack e-commerce platform with Next.js, Prisma, and Stripe integration. Handles 10k+ daily active users.",
        url: "https://github.com/alice/ecommerce",
        status: ProjectStatus.COMPLETED,
        visibility: Visibility.PUBLIC,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-01"),
      },
      {
        userId: alice.id,
        title: "Real-time Chat Application",
        description: "WebSocket-based chat app with React, Socket.io, and Redis for presence detection.",
        url: "https://github.com/alice/chat-app",
        status: ProjectStatus.COMPLETED,
        visibility: Visibility.PUBLIC,
        startDate: new Date("2023-06-01"),
        endDate: new Date("2023-09-01"),
      },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Added projects to Alice");

  // ============================================================================
  // 9. ADD QUALIFICATIONS TO ALICE
  // ============================================================================
  await prisma.qualification.createMany({
    data: [
      {
        userId: alice.id,
        title: "B.S. Computer Science",
        institution: "Stanford University",
        year: "2016",
        description: "Focus on software engineering and distributed systems",
        visibility: Visibility.PUBLIC,
      },
      {
        userId: alice.id,
        title: "AWS Certified Solutions Architect",
        institution: "Amazon Web Services",
        year: "2022",
        visibility: Visibility.PUBLIC,
      },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Added qualifications to Alice");

  // ============================================================================
  // 10. CREATE FOLLOW RELATIONSHIPS
  // ============================================================================
  await prisma.follow.createMany({
    data: [
      { followerId: alice.id, followingId: bob.id },
      { followerId: alice.id, followingId: charlie.id },
      { followerId: bob.id, followingId: alice.id },
      { followerId: charlie.id, followingId: alice.id },
      { followerId: bob.id, followingId: charlie.id },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Created follow relationships");

  // ============================================================================
  // 11. CREATE VOUCH FROM BOB TO ALICE
  // ============================================================================
  await prisma.vouch.upsert({
    where: {
      candidateId_voucherId: {
        candidateId: alice.id,
        voucherId: bob.id,
      },
    },
    update: {},
    create: {
      candidateId: alice.id,
      voucherId: bob.id,
      message: "Alice is an exceptional engineer with deep expertise in full-stack development. Highly recommend!",
    },
  });
  console.log("✅ Created vouch from Bob to Alice");

  // ============================================================================
  // 12. CREATE ADDITIONAL INVITE CODES
  // ============================================================================
  await prisma.inviteCode.upsert({
    where: { code: "BETA-ACCESS" },
    update: { enabled: true },
    create: {
      code: "BETA-ACCESS",
      maxUses: 100,
      enabled: true,
      createdById: admin.id,
    },
  });

  await prisma.inviteCode.upsert({
    where: { code: "STAFF-2026" },
    update: { enabled: true, expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
    create: {
      code: "STAFF-2026",
      maxUses: 25,
      enabled: true,
      createdById: admin.id,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },
  });
  console.log("✅ Created additional invite codes");

  console.log("\n🎉 Seed completed successfully!\n");

  console.log("=".repeat(60));
  console.log("ADMIN CREDENTIALS");
  console.log("=".repeat(60));
  console.log("Email:    admin@inspire-lab.app");
  console.log("Password: admin123");
  console.log("Role:     ADMIN");
  console.log();

  console.log("=".repeat(60));
  console.log("TEST USER CREDENTIALS");
  console.log("=".repeat(60));
  console.log("Email:    alice@example.com, bob@example.com, charlie@example.com");
  console.log("Password: password123");
  console.log("Status:   ACTIVE");
  console.log();

  console.log("=".repeat(60));
  console.log("INVITE CODES");
  console.log("=".repeat(60));
  console.log("WELCOME2026  - 50 uses, expires in 1 year");
  console.log("BETA-ACCESS  - 100 uses, no expiration");
  console.log("STAFF-2026   - 25 uses, expires in 90 days");
  console.log();

  console.log("=".repeat(60));
  console.log("DATABASE STATS");
  console.log("=".repeat(60));
  console.log(`Skill Tags:  ${createdSkillTags.length}`);
  console.log(`Tool Tags:   ${createdToolTags.length}`);
  console.log(`Users:       4 (1 admin + 3 test users)`);
  console.log(`Projects:    2`);
  console.log(`Follows:     5`);
  console.log(`Vouches:     1`);
  console.log();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
