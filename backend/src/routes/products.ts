import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { licenseKeys: { where: { status: "UNUSED" } } } },
    },
    orderBy: { name: "asc" },
  });

  const result = products.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    priceInCredits: p.priceInCredits,
    imageUrl: p.imageUrl,
    isManual: p.isManual ?? false,
    availableKeys: p.isManual ? (p.manualStock ?? 0) : p._count.licenseKeys,
  }));

  return res.json(result);
});

router.get("/:id", async (req: Request, res: Response) => {
  const product: any = await prisma.product.findUnique({
    where: { id: req.params.id, isActive: true },
    include: {
      _count: { select: { licenseKeys: { where: { status: "UNUSED" } } } },
    },
  });

  if (!product) return res.status(404).json({ error: "Product not found" });

  return res.json({
    id: product.id,
    name: product.name,
    description: product.description,
    priceInCredits: product.priceInCredits,
    imageUrl: product.imageUrl,
    isManual: product.isManual ?? false,
    availableKeys: product.isManual ? (product.manualStock ?? 0) : product._count.licenseKeys,
  });
});

export default router;