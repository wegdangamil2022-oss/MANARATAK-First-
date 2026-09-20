// ============================================================================
// ARCHIVED HISTORICAL ARTIFACT (LEGACY REFERENCE) - NON-CANONICAL
// This file is archived as part of Issue #1 Tech Stack Conflict Remediation.
// Canonical technology stack is defined in ADR-025 (TypeScript/Prisma).
// ============================================================================

using System.Collections.Generic;
using System.Threading.Tasks;

namespace Manaratak.Enterprise.ReferenceData.Domain.ReferenceFoundation
{
    public interface IReferenceQueryRepository<T> where T : IReferenceEntity
    {
        Task<T> LookupAsync(string publicId);
        Task<T> FindByCodeAsync(string code);
        Task<T> FindByAliasAsync(string alias);
        Task<T> FindBySlugAsync(string slug);
        Task<IEnumerable<T>> AutocompleteAsync(string query);
    }
}
