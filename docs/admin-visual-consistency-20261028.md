# Admin visual consistency

The Settings navigation is the reference for the 28 business workspaces. Account security remains an additional utility page. The authenticated workspace loads `admin-theme.css` after the existing feature styles; the public website, login and sidebar are outside this scope.

Typography uses the locally bundled Cairo font: page titles 22px, section titles 15px, navigation labels 14px and navigation descriptions 12px. Navigation controls have a minimum height of 44px and preserve each owner's grid, order, routing, keyboard behaviour, permissions and disabled states.

Selected navigation uses navy `#142b5f`, gold text/icons `#f0ce7e` and a fine gold bottom rule. Unselected icons alternate petrol `#0e7c86` and darker gold `#946711` on white. Primary actions use petrol with white text. Destructive actions, warnings, delivery states, charts and other semantic status colours retain their domain styling. Connected-section links use navy-to-petrol backgrounds with gold icons. Selected state is still conveyed through ARIA and a border/rule, not colour alone.

Gold rules under panel headings include AI provider readiness. They follow the text direction and do not add large decorative blocks or alter section order.

| Section              | Presentation owner inspected                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Dashboard            | `pages/AdminDashboardPage.tsx`, `features/dashboard/ExecutiveApplications.tsx`                                     |
| Review queue         | `features/review-queue/ReviewWorkspacePage.tsx`                                                                    |
| Scholarships         | `pages/ScholarshipListPage.tsx`, `pages/ScholarshipCatalogDetailPage.tsx`, `pages/ScholarshipImportCenterPage.tsx` |
| Universities         | `pages/UniversityAdminPage.tsx`, `pages/UniversityRelationshipEditorPage.tsx`                                      |
| Majors               | `pages/MajorAdminPage.tsx`, `pages/MajorDetailPage.tsx`                                                            |
| International tests  | `pages/InternationalTestsAdminPage.tsx`, `pages/InternationalTestDetailPage.tsx`                                   |
| Assigned courses     | `features/courses/AssignedCoursesPage.tsx`                                                                         |
| Course catalogue     | `features/courses/CourseCatalogPage.tsx`, `features/courses/NativeCourseEditorPage.tsx`                            |
| Study destinations   | `pages/StudyDestinationsAdminPage.tsx`, `pages/StudyDestinationDetailPage.tsx`                                     |
| Translations         | `pages/AdminTranslationWorkspacePage.tsx`                                                                          |
| CMS                  | `pages/CmsAdminPage.tsx`, `features/cms/CmsSiteWorkspace.tsx`, `features/cms/CmsContentDetails.tsx`                |
| Imports              | `pages/ImportAdminPage.tsx`                                                                                        |
| Certificates         | `pages/CertificateAdminPage.tsx`, certificate editors and details                                                  |
| Notifications        | `pages/NotificationOperationsPage.tsx`                                                                             |
| Health and readiness | `pages/AdminHealthReadinessPage.tsx`, `features/health/HealthReports.tsx`                                          |
| Institution services | `pages/ServicesAdminPage.tsx`, shared `OwnerNavigation`                                                            |
| Finance              | `pages/FinanceAdminPage.tsx`, shared `OwnerNavigation`                                                             |
| Careers              | `pages/CareerAdminPage.tsx`                                                                                        |
| AI                   | `pages/AIGovernancePage.tsx`                                                                                       |
| Student tools        | `pages/StudentToolsAdminPage.tsx`, `features/ai-tools/StudentToolDetails.tsx`                                      |
| Academic taxonomy    | `pages/AcademicTaxonomyAdminPage.tsx`, `TaxonomyNavigation`                                                        |
| Employee identities  | `features/identity-authorization/StaffIdentityWorkspace.tsx`, `OwnerNavigation`                                    |
| Authorization        | `pages/AuthorizationAdminPage.tsx`, `OwnerNavigation`                                                              |
| Audit                | `pages/AuditCenterPage.tsx`, `OperationsNavigation`                                                                |
| Assets               | `pages/AssetAdminPage.tsx`, `OperationsNavigation`                                                                 |
| Student support      | `pages/StudentSupportAdminPage.tsx`, `OperationsNavigation`                                                        |
| Reference data       | `pages/ReferenceDataAdminPage.tsx`, `features/reference-data/ReferenceRecordWorkspace.tsx`                         |
| General settings     | `features/settings/SettingsWorkspace.tsx`, `OwnerNavigation`                                                       |

The `admin-section-navigation` hook marks primary and secondary section navigation explicitly. It is not attached to pagination, table rows, status filters or record-action menus. The original database, authentication, provider configuration and API contracts are untouched by this presentation change.

Validation uses the built production stylesheet in isolated DOM fixtures representing the 28 presentation owners, in RTL and LTR at 320, 768, 1024 and 1440 pixels. It checks computed font sizes, selected labels and descriptions, alternating icon colours, action colours, gold rules and horizontal overflow. These fixtures do not represent an authenticated acceptance test of business-page workflows. No screenshots or database requests are used by the style audit.

The navigation permission test reads both single-string and array-valued guards from production routes. It checks the existing services guard's three alternatives without changing the guard or permission assignments.
