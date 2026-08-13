# Catalog review receipts

Promotion requires a versioned JSON receipt naming the staged catalog checksum, validation-report checksum, diff-report checksum, reviewer decision, decision date, and approved catalog version.

The pipeline rejects missing, mismatched, or non-approved receipts. Updating an upstream source never silently overwrites production.
