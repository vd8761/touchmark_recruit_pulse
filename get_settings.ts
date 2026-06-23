import { prisma } from './src/lib/prisma';
async function main() {
  const s = await prisma.appSetting.findMany();
  console.log(JSON.stringify(s, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
