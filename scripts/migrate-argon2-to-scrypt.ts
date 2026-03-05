import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      OR: [{ passwordHash: { startsWith: '$argon2' } }, { passwordHash: { startsWith: 'argon2$' } }],
    },
    select: {
      id: true,
      login: true,
      forcePasswordChange: true,
    },
    orderBy: { login: 'asc' },
  });

  if (users.length === 0) {
    console.log('Legacy argon2 users not found.');
    return;
  }

  const userIds = users.filter((user) => !user.forcePasswordChange).map((user) => user.id);

  if (userIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { forcePasswordChange: true },
    });
  }

  console.log('Legacy users requiring admin password reset:');
  for (const user of users) {
    console.log(`- ${user.login}`);
  }
}

main()
  .catch((error) => {
    console.error('Legacy password migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
