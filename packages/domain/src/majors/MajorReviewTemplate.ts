export const MAJOR_REVIEW_TEMPLATE:Record<string,readonly string[]>={
  BACHELOR:['identity','overview','study_content','foundation_courses','core_courses','practical_training','skills','tracks','career_links','postgraduate_paths','related_majors','academic_notice','sources'],
  MASTER:['identity','overview','entry_backgrounds','curriculum','tracks','completion_requirements','advanced_skills','career_links','doctoral_paths','bachelor_links','academic_notice','sources'],
  DOCTORATE:['identity','overview','entry_paths','program_stages','research_fields','research_methods','milestones','dissertation','research_skills','career_links','related_majors','academic_notice','sources'],
};
export function assertMajorReviewCoverage(level:string,coverage:Record<string,string>,sections:readonly {id?:string;content:string}[]):void {
  const required=MAJOR_REVIEW_TEMPLATE[level];
  if(!required) throw new Error('MAJOR_REVIEW_TEMPLATE_UNSUPPORTED');
  if(new Set(Object.values(coverage)).size!==required.length) throw new Error('MAJOR_REVIEW_TEMPLATE_DISTINCT_SECTIONS_REQUIRED');
  if(Object.keys(coverage).some(key=>!required.includes(key))) throw new Error('MAJOR_REVIEW_UNKNOWN_TEMPLATE_SECTION');
  for(const key of required) {
    const section=sections.find(row=>row.id===coverage[key]);
    if(!section?.content.trim()) throw new Error('MAJOR_REVIEW_TEMPLATE_INCOMPLETE');
  }
}
