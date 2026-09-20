# C4 Container Model v1.0

## 1. Overview

This document defines the Level 2 (Container) architecture for MANARATAK 2.0.

## 2. Diagram Description

- **Web Application**: React / SPA serving the student portals and admin dashboards.
- **API Gateway**: Express.js/Node.js handling ingress, routing, and preliminary authorization.
- **Domain Services**: Modular monolith modules in Node.js/TypeScript implementing the 24 enterprise phases.
- **Database**: PostgreSQL storing relational domain data, managed via Prisma ORM.
- **Message Broker / Async Jobs**: Redis + BullMQ for event-driven choreographies and outbox pattern implementations.

## 3. Communication Patterns

- Synchronous interactions: REST/GraphQL.
- Asynchronous interactions: BullMQ event streams.
- External Integrations: Secure API calls to AI Providers and payment systems.

## 4. Approvals

- **Status:** Approved
- **Version:** 1.0
