# Phase 05 RBAC / Permissions: Durable Persistence Layer

This document describes the design, implementation, and verification of the durable persistence layer for Phase 05 RBAC / Authorization / Permissions.

## 1. Overview
As part of Phase 05, the RBAC/Permissions slice now includes concrete, production-ready Prisma-backed repositories to support durable cloud database storage, while maintaining full backward compatibility with in-memory persistence for local/test usage.

## 2. Prisma Database Schema
The following models have been appended to `/packages/infrastructure/prisma/schema.prisma`:

### `RoleRecord`
Represents a user role containing permissions and policies.
* `id` (String, Primary Key)
* `name` (String)
* `description` (String)
* `permissions` (Json) - Array of permission reference strings.
* `policyIds` (Json) - Array of attached policy identifier strings.
* `createdAt` (DateTime)
* `updatedAt` (DateTime)

### `PolicyRecord`
Represents security policy rules.
* `id` (String, Primary Key)
* `name` (String)
* `description` (String)
* `ruleType` (String) - Represents policy rule type (e.g. "TIME", "IP", etc.).
* `ruleConfiguration` (String) - Policy rule configuration string.
* `createdAt` (DateTime)
* `updatedAt` (DateTime)

### `RoleAssignmentRecord`
Maps a primitive identity identifier to a role.
* `id` (String, Primary Key)
* `identityId` (String) - Primitive ID of the user identity. Indexed for fast lookup.
* `roleId` (String) - ID of the assigned role. Indexed.
* `assignedAt` (DateTime)

## 3. Concrete Repository Implementations
The following repositories have been implemented in `packages/infrastructure/src/authorization/`:

1. **`PrismaRoleRepository`**: Maps `Role` domain aggregate to/from `RoleRecord` using the safe local delegate pattern (bypassing the need for static Prisma Client generation).
2. **`PrismaPolicyRepository`**: Maps `Policy` domain aggregate to/from `PolicyRecord`.
3. **`PrismaRoleAssignmentRepository`**: Maps `RoleAssignment` domain aggregate to/from `RoleAssignmentRecord`.
4. **`InMemoryRoleRepository`**, **`InMemoryPolicyRepository`**, and **`InMemoryRoleAssignmentRepository`**: Functional, memory-backed repositories used during local execution and unit tests.

## 4. DI Container Bindings
The dependency injection container (`apps/api/src/infrastructure/di/container.ts`) has been updated to dynamically switch between the Prisma-backed repositories and InMemory-backed repositories based on the `isPrisma` configuration flag:

```typescript
roleRepository: asFunction(({ prisma }) => isPrisma ? new PrismaRoleRepository(prisma) : new InMemoryRoleRepository()).singleton(),
policyRepository: asFunction(({ prisma }) => isPrisma ? new PrismaPolicyRepository(prisma) : new InMemoryPolicyRepository()).singleton(),
roleAssignmentRepository: asFunction(({ prisma }) => isPrisma ? new PrismaRoleAssignmentRepository(prisma) : new InMemoryRoleAssignmentRepository()).singleton(),
```

## 5. Security and Compliance Check
* **Identity Isolation**: Decoupled from user credentials, sessions, or tokens. Operates purely on the primitive `identityId`.
* **No Leaked Scopes**: No fields, tables, or logic for Organizations or Employers are introduced.
* **Audit Logs & UI**: Audit logs and UI management screens are out of scope and deferred.
