# Course lecture content blocks recovery

Migration: 20261025210000_course_lesson_content_blocks. Classification: FORWARD_FIX_ONLY.

The migration adds CourseLessonContentBlock, its owner/reference constraints and indexes, plus a composite unique index on existing lesson identifiers. It does not rewrite or delete existing lectures, enrollments, assets, assessments or certificates.

On an application rollback, restore the previous application/UI while retaining the new table, indexes, blocks and audit history. Do not drop populated blocks or detach owner references to manufacture compatibility. Correct schema errors with a reviewed forward migration. A full database restore requires a separate recovery decision and consideration of writes made after the backup.

Before shared-target execution, verify the exact database and migration identity, preserve a private pre-activation backup, and use the existing database mutation gate and separate migration/application roles. Verify migration ledger checksums and unchanged existing course records afterward. This document grants no deployment authorization.
