import { config as loadEnv } from "dotenv";
import { defineConfig } from "@prisma/config";

loadEnv();

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING;

if (!databaseUrl) {
  throw new Error(
    "Missing database connection string. Set DATABASE_URL or POSTGRES_PRISMA_URL/POSTGRES_URL(_NON_POOLING).",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
    // shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
