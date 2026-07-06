# Connector Specification

Every PCS connector must follow a standard file and responsibility structure.

## Required Connector Components

Each connector folder should contain:

- `README.md`
- `connector.py`
- `schema.md`
- validation documentation or validation hooks
- output JSON documentation
- metadata documentation

## README

The connector README should describe the provider, dataset, scientific variable, source URL, license, access method, current status, and PCS role.

## connector.py

The connector implementation file is reserved for future code that reads or downloads real source data and writes PCS-standard connector output. It must not fabricate values.

## schema.md

The schema document should describe expected source fields, parsed fields, units, timestamps, quality metadata, and output fields.

## Validation

Every connector must define how its output will be validated before PCS Engine use.

## Output JSON

Every connector must produce PCS-standard output JSON when implemented.

## Metadata

Every connector must record provider, dataset, agency, version, license, source URL, status, and update information.
