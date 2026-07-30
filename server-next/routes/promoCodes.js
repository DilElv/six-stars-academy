import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { code, discountPercent, maxUses, allPackages, packageIds, expiresAt, status, appliesToRegistrationFee } = req.body
  try {
    if (!code || !discountPercent) return res.status(400).json({ error: 'Kode dan persentase diskon wajib diisi' })
    if (![25, 50, 75, 100].includes(discountPercent)) return res.status(400).json({ error: 'Diskon harus 25%, 50%, 75%, atau 100%' })

    const promo = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        discountPercent,
        maxUses: maxUses || 1,
        allPackages: allPackages || false,
        appliesToRegistrationFee: appliesToRegistrationFee || false,
        status: status || 'active',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        packages: allPackages ? undefined : {
          create: (packageIds || []).map((pid) => ({ packageId: pid })),
        },
      },
      include: { packages: true },
    })
    res.status(201).json(promo)
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Kode promo sudah ada' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const promos = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { packages: { include: { package: { select: { id: true, name: true } } } }, _count: { select: { usages: true } } },
    })
    res.json(promos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { code, discountPercent, maxUses, allPackages, packageIds, expiresAt, status, appliesToRegistrationFee } = req.body
  try {
    await prisma.promoCodePackage.deleteMany({ where: { promoCodeId: req.params.id } })

    const promo = await prisma.promoCode.update({
      where: { id: req.params.id },
      data: {
        code: code?.toUpperCase(),
        discountPercent,
        maxUses,
        allPackages: allPackages ?? undefined,
        appliesToRegistrationFee: appliesToRegistrationFee ?? undefined,
        status,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
        packages: allPackages ? undefined : {
          create: (packageIds || []).map((pid) => ({ packageId: pid })),
        },
      },
      include: { packages: { include: { package: { select: { id: true, name: true } } } } },
    })
    res.json(promo)
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Kode promo sudah ada' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await prisma.promoCode.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/validate', async (req, res) => {
  const { code, packageId, amount, registrationFee } = req.body
  try {
    if (!code || !packageId) return res.status(400).json({ error: 'Kode promo dan paket wajib diisi' })

    const promo = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
      include: { packages: true },
    })

    if (!promo) return res.status(404).json({ error: 'Kode promo tidak ditemukan' })
    if (promo.status !== 'active') return res.status(400).json({ error: 'Kode promo sudah tidak aktif' })
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return res.status(400).json({ error: 'Kode promo sudah kadaluarsa' })
    if (promo.usedCount >= promo.maxUses) return res.status(400).json({ error: 'Kode promo sudah habis dipakai' })

    if (!promo.allPackages) {
      const valid = promo.packages.some((p) => p.packageId === packageId)
      if (!valid) return res.status(400).json({ error: 'Kode promo tidak berlaku untuk paket ini' })
    }

    // Discount base = package price, plus the registration fee too if this
    // code is marked to also cover it (otherwise registration fee is charged
    // in full even when a package-only promo is applied).
    const discountBase = (amount || 0) + (promo.appliesToRegistrationFee ? (registrationFee || 0) : 0)
    const discount = Math.round(discountBase * promo.discountPercent / 100)

    res.json({
      valid: true,
      discountPercent: promo.discountPercent,
      discount,
      appliesToRegistrationFee: promo.appliesToRegistrationFee,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
