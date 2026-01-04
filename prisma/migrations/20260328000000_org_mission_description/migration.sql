-- Add mission column back and make description optional
ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "mission" TEXT;

-- Backfill mission from description or placeholder
UPDATE "Organization"
SET "mission" = COALESCE(
	CASE
		WHEN "mission" IS NOT NULL AND "mission" <> '' THEN "mission"
		WHEN "description" IS NOT NULL THEN "description"
		ELSE 'TBD'
	END,
	'TBD'
)
WHERE "mission" IS NULL OR "mission" = '';

-- Mission is required, no default
ALTER TABLE "Organization"
ALTER COLUMN "mission" SET NOT NULL,
ALTER COLUMN "mission" DROP DEFAULT;

-- Description becomes optional
ALTER TABLE "Organization"
ALTER COLUMN "description" DROP NOT NULL;
