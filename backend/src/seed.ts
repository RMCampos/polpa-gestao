import 'dotenv/config';
import { prisma } from './prisma';
import bcrypt from 'bcrypt';

async function main() {
  const existing = await prisma.user.findFirst();
  if (!existing) {
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@polpagestao.com';
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!password) {
      console.error('ERROR: SEED_ADMIN_PASSWORD environment variable is required. Set it and re-run the seed script.');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name: 'Admin User',
        email: email,
        password: hashedPassword,
        role: 'admin'
      }
    });

    console.log(`Created default admin user: ${email}`);
  } else {
    console.log('Database already seeded with users.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
