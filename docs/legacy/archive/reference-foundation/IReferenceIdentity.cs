// ============================================================================
// ARCHIVED HISTORICAL ARTIFACT (LEGACY REFERENCE) - NON-CANONICAL
// This file is archived as part of Issue #1 Tech Stack Conflict Remediation.
// Canonical technology stack is defined in ADR-025 (TypeScript/Prisma).
// ============================================================================

using System;

namespace Manaratak.Enterprise.ReferenceData.Domain.ReferenceFoundation
{
    public interface IReferenceIdentity
    {
        Guid Uuid { get; }
        string PublicId { get; }
        string InternalIdentifier { get; }
        string Slug { get; }
        string StandardCodes { get; }
    }
}
