// ============================================================================
// ARCHIVED HISTORICAL ARTIFACT (LEGACY REFERENCE) - NON-CANONICAL
// This file is archived as part of Issue #1 Tech Stack Conflict Remediation.
// Canonical technology stack is defined in ADR-025 (TypeScript/Prisma).
// ============================================================================

using System.Collections.Generic;

namespace Manaratak.Enterprise.ReferenceData.Domain.ReferenceFoundation
{
    public interface IReferenceMetadata
    {
        IReadOnlyDictionary<string, string> MetadataExtension { get; }
        IReadOnlyDictionary<string, string> GovernanceMetadata { get; }
        IReadOnlyDictionary<string, string> ValidationMetadata { get; }
    }
}
