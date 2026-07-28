---
description: Creates a new Supabase migration following the template's security and "always additive" rules.
argument-hint: [description of the schema change]
---

Requested schema change: $ARGUMENTS

Read `.claude/skills/safe-migrations/SKILL.md` and `.claude/skills/supabase-security/SKILL.md`
before writing any SQL.

1. Check whether the change can be made in a 100% additive way (new table, new optional
   column, new index, new policy). If the person asked for something that sounds destructive
   (removing or renaming a column, changing a type), **don't do it directly** — explain the
   additive alternative (create a new column and migrate the data afterwards) and only proceed
   with something destructive if the person explicitly confirms they understand the risk.
2. Create the file at `supabase/migrations/<timestamp>_<description>.sql`.
3. If it's a new table: include `enable row level security` and the necessary policies in the
   same migration.
4. Run the migration locally (`supabase db push` or equivalent) and confirm with a quick
   `select` that it turned out as expected.
5. Run `.claude/hooks/validate-migration.sh` manually to confirm it will pass on push (the
   hook also runs on its own, but this way you resolve any blocker before trying).
6. Summarize for the person, in plain English, what changed in the database — no unexplained
   jargon.
