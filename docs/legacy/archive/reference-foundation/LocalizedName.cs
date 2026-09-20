// ============================================================================
// ARCHIVED HISTORICAL ARTIFACT (LEGACY REFERENCE) - NON-CANONICAL
// This file is archived as part of Issue #1 Tech Stack Conflict Remediation.
// Canonical technology stack is defined in ADR-025 (TypeScript/Prisma).
// ============================================================================

namespace Manaratak.Enterprise.ReferenceData.Domain.ReferenceFoundation
{
    public record LocalizedName(
        string OfficialName,
        string NativeName,
        string DisplayName,
        string Localized, // Representing Localized Name
        string ShortName
    );
}
