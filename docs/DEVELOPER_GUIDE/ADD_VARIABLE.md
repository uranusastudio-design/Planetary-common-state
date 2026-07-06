# Add a PCS Variable

This document describes the future process for adding a new PCS variable. It does not add any actual variables.

## Process

1. Check `PCS_VARIABLE_REGISTRY`.

   Confirm that the variable is not already defined and that the proposed variable fits within the existing taxonomy.

2. Assign Variable ID.

   Choose a stable identifier following the registry naming rules.

3. Define scientific meaning.

   Provide a precise scientific definition, including domain, subdomain, and intended PCS role.

4. Specify unit.

   Record the physical unit before any normalization or projection.

5. Identify observation source.

   Document possible datasets, providers, instruments, or observation products.

6. Define normalization.

   Describe how the raw observation would be mapped into a PCS-compatible form. Do not hide transformations.

7. Add references.

   Include dataset citations, provider documentation, and scientific references.

8. Mark status as proposed, active, or deprecated.

   New variables should begin as proposed until reviewed.

## Rules

- No actual variables are added here.
- No connector implementation is required.
- No engine implementation is required.
- No dashboard changes are required.

