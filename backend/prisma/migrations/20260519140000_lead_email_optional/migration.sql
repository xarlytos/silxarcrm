-- Make email optional in leads
ALTER TABLE "leads" ALTER COLUMN "email" DROP NOT NULL;
