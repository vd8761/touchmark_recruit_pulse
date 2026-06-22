import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding the database...')

  // 1. Create Default Roles
  const roles = [
    { role_name: 'Super Admin', permissions: { all: true } },
    { role_name: 'Admin', permissions: { clients: 'write', positions: 'write' } },
    { role_name: 'Business Development', permissions: { clients: 'write', positions: 'read' } },
    { role_name: 'Recruitment', permissions: { positions: 'read', closures: 'write' } },
    { role_name: 'Finance', permissions: { positions: 'read', billing: 'read' } },
    { role_name: 'Viewer', permissions: { read_only: true } },
  ]

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { role_name: roleData.role_name },
      update: {},
      create: roleData,
    })
  }
  
  const superAdminRole = await prisma.role.findUnique({
    where: { role_name: 'Super Admin' }
  })

  if (!superAdminRole) {
    throw new Error('Super Admin role could not be created.')
  }

  // 2. Create the default Super Admin User
  const adminEmail = 'ariyappan@touchmarkdes.com'
  const hashedPassword = await bcrypt.hash('Admin@123!', 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Ariyappan (Super Admin)',
      email: adminEmail,
      password_hash: hashedPassword,
      role_id: superAdminRole.id,
      status: 'Active'
    },
  })

  console.log('Database seeding completed successfully!')
  console.log(`Admin User Created: ${admin.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
