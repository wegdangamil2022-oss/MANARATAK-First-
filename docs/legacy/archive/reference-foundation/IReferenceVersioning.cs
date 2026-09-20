// ============================================================================
// ARCHIVED HISTORICAL ARTIFACT (LEGACY REFERENCE) - NON-CANONICAL
// This file is archived as part of Issue #1 Tech Stack Conflict Remediation.
// Canonical technology stack is defined in ADR-025 (TypeScript/Prisma).
// ============================================================================

using System;
using System.Collections.Generic;

namespace Manaratak.Enterprise.ReferenceData.Domain.ReferenceFoundation
{
    public interface IReferenceVersioning
    {
        int VersionNumber { get; }
        DateTime EffectiveFrom { get; }
        DateTime? EffectiveTo { get; }
        IReadOnlyCollection<IReferenceVersioning> VersionHistory { get; }
    }
}
