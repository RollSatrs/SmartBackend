import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { categoriesTable } from './schema';

const categories = [
  { name: 'Дороги', slug: 'roads' },
  { name: 'ЖКХ', slug: 'utilities' },
  { name: 'Транспорт', slug: 'transport' },
  { name: 'Безопасность', slug: 'safety' },
  { name: 'Экология', slug: 'ecology' },
  { name: 'Благоустройство', slug: 'improvement' },
  { name: 'Здравоохранение', slug: 'healthcare' },
  { name: 'Образование', slug: 'education' },
  { name: 'Другое', slug: 'other' },
];

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL обязателен для заполнения справочников');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    await db
      .insert(categoriesTable)
      .values(categories)
      .onConflictDoNothing({ target: categoriesTable.slug });
  } finally {
    await pool.end();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
