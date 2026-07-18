import prisma from './prisma.js'

export async function notifyUser(userId, { type, title, message, link }) {
  return prisma.notification.create({ data: { userId, type, title, message, link } })
}

export async function notifyRole(role, { type, title, message, link }) {
  const users = await prisma.user.findMany({ where: { role }, select: { id: true } })
  if (users.length === 0) return []
  return prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type, title, message, link })),
  })
}
