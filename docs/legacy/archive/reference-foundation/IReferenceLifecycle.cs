// ============================================================================
// ARCHIVED HISTORICAL ARTIFACT (LEGACY REFERENCE) - NON-CANONICAL
// This file is archived as part of Issue #1 Tech Stack Conflict Remediation.
// Canonical technology stack is defined in ADR-025 (TypeScript/Prisma).
// ============================================================================

namespace Manaratak.Enterprise.ReferenceData.Domain.ReferenceFoundation
{
    public enum ReferenceStatus
    {
        Active,
        Deprecated,
        Archived,
        Superseded,
        Merged
    }

    public interface IReferenceLifecycle
    {
        ReferenceStatus Status { get; }
    }
}
