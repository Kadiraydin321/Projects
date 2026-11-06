'use server'

import prisma from '@/lib/prisma'
import { createSession, deleteSession, getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { createLog } from './log'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const sifre = formData.get('sifre') as string

  if (!email || !sifre) {
    return { success: false, error: 'Lütfen email ve şifre giriniz.' }
  }

  try {
    const kullanici = await prisma.kullanici.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!kullanici) {
      return { success: false, error: 'Kullanıcı bulunamadı.' }
    }

    if (kullanici.durum === 'Pasif') {
      return { success: false, error: 'Hesabınız pasif durumdadır.' }
    }

    if (kullanici.sifre !== sifre) {
      return { success: false, error: 'Hatalı şifre.' }
    }

    await createSession(
      kullanici.kullanici_id, 
      kullanici.yetki_seviyesi, 
      kullanici.bolum_id,
      `${kullanici.ad} ${kullanici.soyad}`
    )
    
    // Geçici olarak session'u kendimiz manuel de yollayabiliriz veya loga direkt ad-soyad yazabiliriz.
    // Ancak log oluşturucu session'a baktığı için burada oluşturduk.
    await createLog('LOGIN', `${kullanici.ad} ${kullanici.soyad} sisteme giriş yaptı.`)

  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Sunucu hatası oluştu.' }
  }

  redirect('/')
}

export async function logout() {
  const session = await getSession()
  if (session) {
    await createLog('LOGOUT', `${session.name} sistemden çıkış yaptı.`)
  }
  await deleteSession()
  redirect('/login')
}
