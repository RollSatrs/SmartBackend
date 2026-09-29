import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from 'src';
import { usersTable } from 'src/db/schema';

@Injectable()
export class UsersService {
  findByRole(role: 'gov_official') {
    return db
      .select({
        id: usersTable.id,
        name: usersTable.fullname,
        email: usersTable.email,
      })
      .from(usersTable)
      .where(eq(usersTable.role, role));
  }
}
