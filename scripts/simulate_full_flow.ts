import { PrismaClient } from '@prisma/client';
import { PasswordHasher } from '../packages/infrastructure/src/auth/PasswordHasher';

async function main() {
  let url = process.env.DATABASE_URL || '';
  if (!url || url.includes('postgres-host') || url.includes('placeholder')) {
    const { SQL_USER, SQL_PASSWORD, SQL_HOST, SQL_DB_NAME } = process.env;
    if (SQL_USER && SQL_PASSWORD && SQL_HOST && SQL_DB_NAME) {
      const encodedPassword = encodeURIComponent(SQL_PASSWORD);
      url = `postgresql://${SQL_USER}:${encodedPassword}@localhost/${SQL_DB_NAME}?host=${SQL_HOST}`;
    }
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Successfully connected.');

    // Let's use the verified active user 'wegdangamil2022@gmail.com'
    const email = 'wegdangamil2022@gmail.com';
    const iden = await prisma.identityRecord.findFirst({
      where: { user: { primaryEmail: email } },
      include: { credentials: true }
    });

    if (!iden) {
      console.error('Test user not found.');
      return;
    }

    console.log(`Found active user: ${email} (ID: ${iden.id})`);
    
    // Perform simulated login request against local port 3000
    console.log('Sending login request to localhost:3000...');
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: 'Wegdan1234@1234#',
      }),
    });

    console.log('Login Response Status:', loginRes.status);
    const loginData = await loginRes.json().catch(() => ({}));
    console.log('Login Response Body:', loginData);
    
    const cookies = loginRes.headers.getSetCookie();
    console.log('Returned Cookies:', cookies);

    if (loginRes.status !== 200 || cookies.length === 0) {
      console.error('Login failed in simulation.');
      return;
    }

    // Now extract and attach those cookies to subsequent requests
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    console.log('Prepared Cookie Header for subsequent requests:', cookieHeader);

    // Call /auth/me
    console.log('Sending GET /api/v1/auth/me...');
    const meRes = await fetch('http://localhost:3000/api/v1/auth/me', {
      headers: {
        'Cookie': cookieHeader,
      },
    });
    console.log('/auth/me Response Status:', meRes.status);
    const meData = await meRes.json().catch(() => ({}));
    console.log('/auth/me Response Body:', JSON.stringify(meData));

    // Call /student/dashboard
    console.log('Sending GET /api/v1/student/dashboard...');
    const dbRes = await fetch('http://localhost:3000/api/v1/student/dashboard', {
      headers: {
        'Cookie': cookieHeader,
      },
    });
    console.log('/student/dashboard Response Status:', dbRes.status);
    const dbData = await dbRes.json().catch(() => ({}));
    console.log('/student/dashboard Response Body:', JSON.stringify(dbData));

  } catch (error) {
    console.error('Error during simulated full flow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
