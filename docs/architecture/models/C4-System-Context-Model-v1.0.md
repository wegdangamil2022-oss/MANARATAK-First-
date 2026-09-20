# C4 System Context Model v1.0

## 1. Overview

This document defines the Level 1 (System Context) architectural diagram for the MANARATAK 2.0 Enterprise Platform. It outlines the platform's relationship with external actors, systems, and enterprise boundaries.

## 2. Diagram Description

- **Enterprise Platform (MANARATAK 2.0)**: The core system providing 24 distinct bounded contexts serving students, educators, and institutions.
- **Actors**:
  - Students
  - University Administrators
  - Content Creators
  - External Partners
- **External Systems**:
  - Payment Gateways (Stripe/Checkout)
  - Identity Providers (OAuth/SSO)
  - Content Delivery Networks
  - Third-party AI Providers

## 3. Technology Stack Alignment

The system context assumes the TS/Node/Express backend interacting via REST/gRPC with BullMQ for async workflows, utilizing PostgreSQL as the primary persistence layer.

## 4. Approvals

- **Status:** Approved
- **Version:** 1.0
