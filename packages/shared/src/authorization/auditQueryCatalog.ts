/** Versioned suggestions, not an exhaustive ledger vocabulary. Unknown owner codes remain searchable. */
export const AUDIT_QUERY_CATALOG = {
  version: 1,
  complete: false,
  actions: ['MUTATION_INTENT_RECORDED', 'MUTATION_OUTCOME_RECORDED', 'ROLE_ASSIGNED',
    'ROLE_ASSIGNMENT_REVOKED', 'STUDENT_SUPPORT_RESET_LAYOUT'],
  categories: ['AUTHORIZATION_MUTATION', 'AUTHORIZATION', 'CRITICAL_MUTATION', 'STANDARD_MUTATION',
    'IDENTITY', 'IDENTITY_MUTATION', 'STUDENT_SUPPORT', 'FINANCE_MUTATION', 'SCHOLARSHIPS_MUTATION'],
} as const;
