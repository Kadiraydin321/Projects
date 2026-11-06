const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.kullanici.findMany({ include: { anlik_cihazlar: true } });
  
  let u1 = null;
  let u2 = null;
  
  for (let u of users) {
    if (u.anlik_cihazlar.length > 0) {
      if (!u1) {
        u1 = u;
      } else if (!u2 && u.kullanici_id !== u1.kullanici_id) {
        u2 = u;
        break;
      }
    }
  }

  if (u1 && !u2) {
    u2 = users.find(u => u.kullanici_id !== u1.kullanici_id);
    const newCihaz = await prisma.cihaz.create({
      data: {
        marka: 'TEST_HIOKI',
        durum: 'Aktif',
        anlik_kullanici_id: u2.kullanici_id
      }
    });
    u2.anlik_cihazlar = [newCihaz];
  }

  if (u1 && u2) {
    await prisma.transferIstegi.create({
      data: {
        istek_tipi: 'TAKAS',
        durum: 'SEF_ONAYI_BEKLIYOR',
        gonderen_id: u1.kullanici_id,
        alici_id: u2.kullanici_id,
        gonderen_cihaz_id: u1.anlik_cihazlar[0].cihaz_id,
        alici_cihaz_id: u2.anlik_cihazlar[0].cihaz_id
      }
    });
    console.log('Takas olusturuldu: ' + u1.ad + ' <-> ' + u2.ad);
  } else {
    console.log('Takas icin uygun kullanici bulunamadi.');
  }
}
run().finally(() => prisma.$disconnect());
