# AGROSBO

Offline-first coffee traceability web app for agricultural cooperatives, built with Kiro and AWS.

## Status

Work in progress — validating technical risks through spikes.

## MVP Scope

AGROSBO maintains the chain of provenance from field to shipment for a coffee cooperative:

Producer → Parcel → Harvest → Lot → Transformation → Resulting Lot → Shipment → Completeness Review → Sealed Snapshot → Evidence Package

The system tracks quantities, documents, and lineage so that every kilogram in a shipment can be traced back to its origin producer and parcel.

## Architecture (approved)

- Frontend: React + TypeScript + Vite, PWA (IndexedDB for offline queue)
- Hosting: AWS Amplify Hosting
- Auth: Amazon Cognito (JWT authorizer on API Gateway)
- Backend: API Gateway HTTP API + Lambda modular monolith (TypeScript)
- Database: Aurora PostgreSQL Serverless v2 (RDS Data API)
- Storage: Amazon S3 (presigned URLs)
- Document extraction: Amazon Textract
- IaC: AWS CDK
- Observability: CloudWatch

## Important disclaimer

AGROSBO is not a certifier, does not substitute official systems, and does not guarantee regulatory compliance. The output is an internal traceability and evidence package prepared for human review.

## Hackathon

This project participates in the Kiro, AWS, and Codigo Facilito Hackathon (Category 2: Web Applications).

Key Kiro features used: Steering, Specs, Hooks, Requirements (EARS), Design, Tasks, incremental review, and IaC.

## Current status

Spike A (offline sync protocol) validated: idempotency, dependency ordering, duplicate detection, IndexedDB persistence, and file/transaction separation — 22/22 tests pass.

Next: Spike B (recursive lineage query) and Spike C (document extraction benchmark).
