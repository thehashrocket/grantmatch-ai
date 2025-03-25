import { z } from "zod"

export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mission: z.string().min(1, "Mission is required"),
  focusAreas: z.array(z.string()).min(1, "At least one focus area is required"),
  location: z.string().min(1, "Location is required"),
}) 