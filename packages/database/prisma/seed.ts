/**
 * Database seed script
 * Run with: pnpm db:seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create initial system configuration
  const config = await prisma.systemConfig.upsert({
    where: { key: 'app_version' },
    update: { value: '0.1.0' },
    create: {
      key: 'app_version',
      value: '0.1.0',
    },
  });

  console.log('✅ Created system config:', config);

  // Additional seed data will be added in subsequent issues
  // when Organization, User, and other models are defined

  console.log('✅ Seeding completed successfully');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
