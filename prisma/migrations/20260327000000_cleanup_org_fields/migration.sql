-- Drop obsolete columns
ALTER TABLE "Organization"
DROP COLUMN IF EXISTS "focusKeywords",
DROP COLUMN IF EXISTS "geographyKeywords",
DROP COLUMN IF EXISTS "applicantType",
DROP COLUMN IF EXISTS "mission";

-- Rename award preference fields
ALTER TABLE "Organization"
RENAME COLUMN "minAward" TO "preferredAwardMin";

ALTER TABLE "Organization"
RENAME COLUMN "maxAward" TO "preferredAwardMax";

-- Drop unused enum
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrganizationApplicantType') THEN
		DROP TYPE "OrganizationApplicantType";
	END IF;
END $$;
