// ============================================================================
// ARCHIVED HISTORICAL ARTIFACT (LEGACY REFERENCE) - NON-CANONICAL
// This file is archived as part of Issue #1 Tech Stack Conflict Remediation.
// Canonical technology stack is defined in ADR-025 (TypeScript/Prisma).
// ============================================================================

using System.Threading.Tasks;

namespace Manaratak.Enterprise.ReferenceData.Domain.ReferenceFoundation
{
    public interface IReferenceRepository<T> where T : IReferenceEntity
    {
        Task AddAsync(T entity);
        Task ChangeStatusAsync(T entity, ReferenceStatus newStatus);
        Task CreateNewVersionAsync(T entity);
        
        // Note: No Hard Delete methods (e.g., Delete/Remove) per architectural rules
    }
}
