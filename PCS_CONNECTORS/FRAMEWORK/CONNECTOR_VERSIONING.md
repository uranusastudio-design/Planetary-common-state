# Connector Versioning

PCS connectors must use explicit version numbering.

## Version Numbering

### v0.x Prototype

Prototype connectors may define structure, source access plans, early parsing logic, or pending data-access notes. They are not automatically operational.

### v1.x Operational

Operational connectors access real source data, produce PCS-standard output, pass validation, and are maintained for regular workflows.

### v2.x Major Revision

Major revisions indicate substantial changes to source access, parsing, output schema, validation behavior, scientific variable definitions, or provider strategy.

## Version Rules

- Version changes must be documented.
- Output schema changes must be noted.
- Provider or dataset changes must be recorded.
- Deprecated versions must remain traceable.
