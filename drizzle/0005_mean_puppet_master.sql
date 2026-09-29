CREATE TYPE "public"."idea_photo_flag" AS ENUM('consistent', 'inconsistent', 'uncertain');--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "photo_flag" "idea_photo_flag";--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "photo_flag_reason" text;