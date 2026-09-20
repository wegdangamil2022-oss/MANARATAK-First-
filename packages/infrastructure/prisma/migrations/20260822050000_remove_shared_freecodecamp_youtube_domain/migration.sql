-- WP-IC-02 provenance hardening: a generic YouTube URL does not prove that it
-- belongs to freeCodeCamp. Course rows using that host must not receive
-- automatic provider provenance approval.
DELETE FROM "ExternalCourseProviderDomain"
WHERE "providerId" = 'a7a5fd94-6632-5a2e-b411-fb60bfc32445'
  AND "normalizedDomain" = 'youtube.com';
