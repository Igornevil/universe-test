CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"event_name" varchar(64) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "notifications_event_id_unique" UNIQUE("event_id")
);
