---
name: safe-migrations
description: Use this skill whenever you need to create or edit a file under supabase/migrations, change a database schema, or reason about a migration that will run during deployment. Enforces additive-only, non-destructive migrations for non-technical users who cannot debug a broken production database.
---

# Safe (Additive-Only) Migrations

The person using this template cannot fix a broken migration themselves. The only acceptable
failure mode is "the migration didn't need to run anything destructive, so nothing could
break." Design every schema change around that constraint.

## Allowed without asking

- `create table ...` (with RLS enabled — see `supabase-security` skill)
- `alter table ... add column ... [default ... | null]` — new columns must be nullable or
  have a default, so existing rows never fail the migration
- `create index`, `create unique index`
- `create policy`, `alter policy`
- `create function`, `create trigger` for **new** behavior
- Adding a new enum value with `alter type ... add value`

## Never do without an explicit, written rollback plan and explicit confirmation from the person

- `drop table`, `drop column`
- `alter column ... type ...` (changes an existing column's type)
- `rename column` / `rename table`
- `alter column ... set not null` on a column that already has rows (can fail on existing null
  data)
- Any `update`/`delete` against existing data as part of a schema migration

If a column's shape needs to change, add a **new** column (`price_cents` instead of rewriting
`price`), backfill it in an explicit, separate, reviewable step, and only deprecate the old
column (stop writing to it) once the new one is confirmed working — never drop it in the same
change that introduces the new one.

## File naming & structure

- One migration per file: `supabase/migrations/<timestamp>_<snake_case_description>.sql`
- Never edit a migration file that has already been applied/pushed. If something in an applied
  migration was wrong, write a new migration that adds the fix additively.

## Enforcement

`.claude/hooks/validate-migration.sh` runs automatically before any push that touches
`supabase/migrations/**`. It greps new migration files for destructive keywords (`drop `,
`alter column`, `rename `, `truncate`) and blocks the push if any are found without a
`-- ALLOW-DESTRUCTIVE: <reason>` comment directly above the statement, which only Claude adds
after the person has explicitly confirmed they understand the risk and a rollback plan exists.

## Checklist before considering a migration "done"

- [ ] Migration only adds (table/column/index/policy), never alters or removes
- [ ] New columns are nullable or have a `default`
- [ ] RLS + policies included if a new table was created
- [ ] Applied locally with `supabase db push` (or the project's migration runner) and verified
      with a quick `select` before telling the person it's ready
