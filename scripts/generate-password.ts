import { hash } from 'bcryptjs';

async function generateHash() {
  const password = process.argv[2];
  
  if (!password) {
    console.error('Please provide a password as an argument');
    console.error('Usage: pnpm tsx scripts/generate-password.ts "your-password"');
    process.exit(1);
  }

  try {
    const hashedPassword = await hash(password, 12);
    console.log('Hashed password:', hashedPassword);
  } catch (error) {
    console.error('Error generating hash:', error);
    process.exit(1);
  }
}

generateHash(); 