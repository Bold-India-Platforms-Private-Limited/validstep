import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const updateMe = asyncHandler(async (req, res) => {
  const { name, mobile, image } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(mobile !== undefined && { mobile }),
      ...(image !== undefined && { image }),
    },
    select: { id: true, name: true, email: true, mobile: true, image: true, isSuperAdmin: true },
  });
  res.json({ user });
});
