import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const query = 'ahmet'
  const searchStr = query.toLowerCase()
  
  const kullanicilar = await prisma.kullanici.findMany({
      where: {
        OR: [
          { ad: { contains: searchStr } },
          { soyad: { contains: searchStr } },
          { sicil_no: { contains: searchStr } },
        ]
      },
      include: { bolum: true },
      take: 5
  })
  console.log("Kullanıcılar:", kullanicilar)
}

main().catch(console.error).finally(() => prisma.$disconnect())
