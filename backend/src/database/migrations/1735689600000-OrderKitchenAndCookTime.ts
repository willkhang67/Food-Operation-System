import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotent catch-up for production databases that evolved under synchronize.
 *
 * Safe to run on:
 * - DBs that already have these objects (no-op / skip)
 * - DBs missing kitchen ETA columns or order_items.cook_time
 * - DBs still using the legacy "delivered" order status label
 */
export class OrderKitchenAndCookTime1735689600000 implements MigrationInterface {
  name = 'OrderKitchenAndCookTime1735689600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'orders_status_enum'
        ) THEN
          ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'ready';
        END IF;
      END $$;
    `);

    // Legacy rows before the delivered → ready rename.
    await queryRunner.query(`
      UPDATE "orders"
      SET "status" = 'ready'
      WHERE "status"::text = 'delivered';
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "estimated_ready_at" TIMESTAMPTZ;
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMPTZ;
    `);

    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD COLUMN IF NOT EXISTS "cook_time" integer NOT NULL DEFAULT 1;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order_items" DROP COLUMN IF EXISTS "cook_time";
    `);

    await queryRunner.query(`
      ALTER TABLE "orders" DROP COLUMN IF EXISTS "paid_at";
    `);

    await queryRunner.query(`
      ALTER TABLE "orders" DROP COLUMN IF EXISTS "estimated_ready_at";
    `);

    // Enum values cannot be removed safely in PostgreSQL; leave 'ready' in place.
  }
}
