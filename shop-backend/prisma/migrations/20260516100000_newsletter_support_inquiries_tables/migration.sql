-- Tables exist in Prisma schema but were never added in postgresql_init.
-- Production DBs may lack them; IF NOT EXISTS keeps deploy safe.

CREATE SEQUENCE IF NOT EXISTS newsletter_leads_id_seq;
CREATE SEQUENCE IF NOT EXISTS support_inquiries_id_seq;

CREATE TABLE IF NOT EXISTS "newsletter_leads" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    CONSTRAINT "newsletter_leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_inquiries" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "question" TEXT NOT NULL,
    "priority" TEXT,
    "language" TEXT,
    "source" TEXT,
    "status" TEXT,
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    CONSTRAINT "support_inquiries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "newsletter_leads" ALTER COLUMN "id" SET DEFAULT next_prefixed_id('nl', 'newsletter_leads_id_seq'::regclass);
ALTER TABLE "support_inquiries" ALTER COLUMN "id" SET DEFAULT next_prefixed_id('sup', 'support_inquiries_id_seq'::regclass);
