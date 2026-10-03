-- Make the workflow lookup atomic.
--
-- `processToDatabase` resolved a workflow with find-then-create. Two CI
-- pipelines reporting the same workflow at the same time both found nothing
-- and both created a row, because there was no constraint for the database to
-- catch it. With the constraint in place the same code path can be an upsert.
--
-- Generated from the schema change rather than written by hand; the index name
-- follows Prisma's convention for @@unique([repositoryId, name]).
--
-- Applying this to a database that already contains duplicate workflows would
-- fail. That is the correct behaviour - the duplicates are real data problems
-- and silently deleting rows in a migration is not something a migration should
-- decide on its own. Resolve them first, then apply.

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_repositoryId_name_key" ON "Workflow"("repositoryId", "name");