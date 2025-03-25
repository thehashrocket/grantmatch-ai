import { router, publicProcedure } from "../trpc"
import { createOrganizationSchema } from "@/lib/validations/organization"
import { prisma } from "@/lib/prisma"

export const organizationRouter = router({
  create: publicProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ input }) => {
      const organization = await prisma.organization.create({
        data: {
          ...input,
        },
      })
      
      return organization
    }),
}) 