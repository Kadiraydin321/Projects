import prisma from './prisma'
import { getSession } from './session'

export async function checkPermission(permissionKey: string): Promise<boolean> {
  const session = await getSession()
  if (!session) return false

  const roleName = session.role as string

  // Always allow Admin full access for safety net? 
  // Better to rely on DB, but 'Admin' is a strong keyword.
  if (roleName === 'Admin' && permissionKey === 'admin_panel_erisimi') {
    return true
  }

  try {
    const rol = await prisma.rol.findUnique({
      where: { ad: roleName }
    })
    
    if (!rol) return false
    
    // Convert generic key access
    return (rol as any)[permissionKey] === true
  } catch (err) {
    console.error('Permission check error:', err)
    return false
  }
}

export async function getUserRolePermissions() {
  const session = await getSession()
  if (!session) return null

  try {
    const rol = await prisma.rol.findUnique({
      where: { ad: session.role as string }
    })
    return rol
  } catch (err) {
    return null
  }
}
