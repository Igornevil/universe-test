CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
