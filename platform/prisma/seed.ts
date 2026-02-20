import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seed...\n");

  // ============================================================
  // CLEANUP - Delete all existing data in correct order
  // ============================================================
  console.log("🧹 Cleaning up existing data...");
  await prisma.message.deleteMany();
  await prisma.chatGroupMember.deleteMany();
  await prisma.chatGroup.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.robot.deleteMany();
  await prisma.workspaceFile.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.tenantUser.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
  console.log("✅ Cleanup complete\n");

  // ============================================================
  // USERS
  // ============================================================
  console.log("👤 Creating users...");
  const passwordHash = await bcrypt.hash("password123", 10);

  const alice = await prisma.user.create({
    data: {
      email: "alice@example.com",
      name: "Alice Zhang",
      passwordHash,
    },
  });
  console.log(`  ✓ Created user: ${alice.name} (${alice.email})`);

  const bob = await prisma.user.create({
    data: {
      email: "bob@example.com",
      name: "Bob Smith",
      passwordHash,
    },
  });
  console.log(`  ✓ Created user: ${bob.name} (${bob.email})\n`);

  // ============================================================
  // TENANT
  // ============================================================
  console.log("🏢 Creating tenant...");
  const tenant = await prisma.tenant.create({
    data: {
      name: "Acme Corp",
      slug: "acme-corp",
      ownerId: alice.id,
    },
  });
  console.log(`  ✓ Created tenant: ${tenant.name} (${tenant.slug})\n`);

  // ============================================================
  // TENANT USERS
  // ============================================================
  console.log("👥 Adding users to tenant...");
  await prisma.tenantUser.create({
    data: {
      userId: alice.id,
      tenantId: tenant.id,
      role: "owner",
    },
  });
  console.log(`  ✓ Added ${alice.name} as owner`);

  await prisma.tenantUser.create({
    data: {
      userId: bob.id,
      tenantId: tenant.id,
      role: "user",
    },
  });
  console.log(`  ✓ Added ${bob.name} as member\n`);

  // ============================================================
  // ROBOT
  // ============================================================
  console.log("🤖 Creating robot...");
  const atlas = await prisma.robot.create({
    data: {
      name: "Atlas",
      tenantId: tenant.id,
      createdById: alice.id,
      status: "created",
      soulMd: `# Atlas - Coding Assistant

## Purpose
Atlas is an AI-powered coding assistant designed to help developers write better code faster.

## Capabilities
- Code generation and completion
- Bug detection and fixing
- Code review and suggestions
- Documentation generation
- Refactoring assistance

## Personality
Helpful, precise, and always learning. Atlas communicates in a clear, technical manner while remaining approachable.`,
    },
  });
  console.log(`  ✓ Created robot: ${atlas.name} (ID: ${atlas.id})\n`);

  // ============================================================
  // TEAM
  // ============================================================
  console.log("⚡ Creating team...");
  const team = await prisma.team.create({
    data: {
      name: "Engineering",
      tenantId: tenant.id,
    },
  });
  console.log(`  ✓ Created team: ${team.name}\n`);

  // ============================================================
  // TEAM MEMBERS
  // ============================================================
  console.log("👥 Adding members to team...");
  await prisma.teamMember.createMany({
    data: [
      {
        teamId: team.id,
        memberId: alice.id,
        memberType: "human",
      },
      {
        teamId: team.id,
        memberId: bob.id,
        memberType: "human",
      },
      {
        teamId: team.id,
        memberId: atlas.id,
        memberType: "robot",
      },
    ],
  });
  console.log(`  ✓ Added ${alice.name} (human)`);
  console.log(`  ✓ Added ${bob.name} (human)`);
  console.log(`  ✓ Added ${atlas.name} (robot)\n`);

  // ============================================================
  // CHATGROUP
  // ============================================================
  console.log("💬 Creating chatgroup...");
  const chatGroup = await prisma.chatGroup.create({
    data: {
      name: "General",
      teamId: team.id,
      createdById: alice.id,
    },
  });
  console.log(`  ✓ Created chatgroup: ${chatGroup.name}\n`);

  // ============================================================
  // CHATGROUP MEMBERS
  // ============================================================
  console.log("👥 Adding members to chatgroup...");
  await prisma.chatGroupMember.createMany({
    data: [
      {
        chatGroupId: chatGroup.id,
        memberId: alice.id,
        memberType: "human",
      },
      {
        chatGroupId: chatGroup.id,
        memberId: bob.id,
        memberType: "human",
      },
      {
        chatGroupId: chatGroup.id,
        memberId: atlas.id,
        memberType: "robot",
      },
    ],
  });
  console.log(`  ✓ Added ${alice.name} (human)`);
  console.log(`  ✓ Added ${bob.name} (human)`);
  console.log(`  ✓ Added ${atlas.name} (robot)\n`);

  // ============================================================
  // MESSAGES
  // ============================================================
  console.log("📨 Creating messages...");
  
  const message1 = await prisma.message.create({
    data: {
      chatGroupId: chatGroup.id,
      senderId: alice.id,
      senderType: "human",
      content: "Hey team! Welcome to our new workspace. Excited to work with everyone! 🎉",
    },
  });
  console.log(`  ✓ ${alice.name}: "${message1.content.substring(0, 50)}..."`);

  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));

  const message2 = await prisma.message.create({
    data: {
      chatGroupId: chatGroup.id,
      senderId: bob.id,
      senderType: "human",
      content: "Thanks Alice! Looking forward to collaborating. Does anyone have the latest design docs?",
    },
  });
  console.log(`  ✓ ${bob.name}: "${message2.content.substring(0, 50)}..."`);

  await new Promise((resolve) => setTimeout(resolve, 100));

  const message3 = await prisma.message.create({
    data: {
      chatGroupId: chatGroup.id,
      senderId: atlas.id,
      senderType: "robot",
      content: "Hello everyone! I'm Atlas, your coding assistant. I'm here to help with code reviews, bug fixes, and any technical questions you might have. Feel free to tag me anytime!",
    },
  });
  console.log(`  ✓ ${atlas.name}: "${message3.content.substring(0, 50)}..."\n`);

  // ============================================================
  // WORKSPACE FILE
  // ============================================================
  console.log("📁 Creating workspace file metadata...");
  const workspaceFile = await prisma.workspaceFile.create({
    data: {
      path: "/uploads/chatgroups/general/design-mockups-v2.pdf",
      filename: "design-mockups-v2.pdf",
      mimeType: "application/pdf",
      size: BigInt(2458624), // ~2.4 MB
      uploadedById: alice.id,
      scope: "chatgroup",
      scopeId: chatGroup.id,
    },
  });
  console.log(`  ✓ Created file: ${workspaceFile.filename} (${workspaceFile.scope})\n`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("✅ Seed completed successfully!\n");
  console.log("📊 Summary:");
  console.log(`  • Users: 2 (${alice.name}, ${bob.name})`);
  console.log(`  • Tenant: ${tenant.name}`);
  console.log(`  • Robot: ${atlas.name}`);
  console.log(`  • Team: ${team.name} (3 members)`);
  console.log(`  • ChatGroup: ${chatGroup.name} (3 members, 3 messages)`);
  console.log(`  • Files: 1 workspace file`);
  console.log("\n🔐 Test credentials:");
  console.log(`  Alice: alice@example.com / password123`);
  console.log(`  Bob: bob@example.com / password123\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
