# Major publication authority

P10 publishes a **Major level profile**, selected by its canonical root ID plus degree/profile identity. `MajorLevelProfile.currentPublishedVersionId` and the matching immutable `MajorPublicationSnapshot` are authoritative for that profile's content. A root with two published profiles has two releases; publishing or unpublishing one does not implicitly publish its sibling.

`Major.currentPublishedVersionId` is a representative compatibility pointer. Consumers must not interpret it as a complete release for every level. Public P10 reads use the selected profile snapshot. A consumer storing Major.id/degreeLevelId references the concept/level, rather than receiving permission to edit the Major or copying mutable names as a second authority.

The new P11/P12 usage read models report explicit relationship rows and their owner's publication scope. They do not derive published content or admission eligibility from the root pointer. Unknown/unresolved labels are not interpreted as zero usage or automatically linked by name. Runtime verification of consumer/event delivery remains part of Post-28 acceptance.
