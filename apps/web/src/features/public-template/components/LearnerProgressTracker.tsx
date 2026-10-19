import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import { ApplicationMilestone, Scholarship, Course } from '../types';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Calendar,
  Sparkles,
  BookOpen,
  FileText,
  Trash2,
  Trophy,
  BellRing,
  X,
} from 'lucide-react';

interface LearnerProgressTrackerProps {
  milestones: ApplicationMilestone[];
  onUpdateMilestone: (updated: ApplicationMilestone) => void;
  onAddMilestone: (newMilestone: ApplicationMilestone) => void;
  onDeleteMilestone: (id: string) => void;
  allScholarships: Scholarship[];
  courses: Course[];
  onOpenAiLetterForScholarship?: (scholarshipTitle: string) => void;
  onOpenScholarshipDetails?: (scholarship: Scholarship) => void;
}

export const LearnerProgressTracker: React.FC<LearnerProgressTrackerProps> = ({
  milestones,
  onUpdateMilestone,
  onAddMilestone,
  onDeleteMilestone,
  allScholarships,
  courses,
  onOpenAiLetterForScholarship,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(milestones[0]?.id || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newScholarshipId, setNewScholarshipId] = useState(allScholarships[0]?.id || '');
  const [newNotes, setNewNotes] = useState('');

  const activeMilestone = milestones.find((m) => m.id === selectedMilestoneId) || milestones[0];

  // Calculate overall stats
  const totalChecklistItems = milestones.reduce((acc, m) => acc + m.checklist.length, 0);
  const completedChecklistItems = milestones.reduce(
    (acc, m) => acc + m.checklist.filter((c) => c.completed).length,
    0,
  );
  const overallPercentage =
    totalChecklistItems > 0 ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 0;

  const handleToggleTask = (milestoneId: string, taskId: string) => {
    const target = milestones.find((m) => m.id === milestoneId);
    if (!target) return;

    const updatedChecklist = target.checklist.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task,
    );

    const completedCount = updatedChecklist.filter((t) => t.completed).length;
    const newProgress = Math.round((completedCount / updatedChecklist.length) * 100);

    let newStage = target.stage;
    if (newProgress === 100) newStage = 'تم إرسال الطلب';
    else if (newProgress >= 70) newStage = 'خطابات التوصية';
    else if (newProgress >= 40) newStage = 'كتابة خطاب الدافع';
    else newStage = 'تجهيز المستندات';

    onUpdateMilestone({
      ...target,
      checklist: updatedChecklist,
      progress: newProgress,
      stage: newStage,
    });
  };

  const handleAddNewTracker = () => {
    const sch = allScholarships.find((s) => s.id === newScholarshipId);
    if (!sch) return;

    const newEntry: ApplicationMilestone = {
      id: `track-${Date.now()}`,
      scholarshipId: sch.id,
      scholarshipTitle: sch.title,
      country: sch.country,
      deadline: sch.deadline,
      stage: 'تجهيز المستندات',
      progress: 0,
      notes: newNotes || 'متابعة خطة التقديم الرسمية لمنحة ' + sch.title,
      checklist: [
        { id: `c-${Date.now()}-1`, task: 'ترجمة وتصديق كشف العلامات الجامعي', completed: false },
        { id: `c-${Date.now()}-2`, task: 'إعداد السيرة الذاتية الأكاديمية', completed: false },
        {
          id: `c-${Date.now()}-3`,
          task: 'صياغة خطاب الدافع (Motivation Letter)',
          completed: false,
        },
        { id: `c-${Date.now()}-4`, task: 'الحصول على خطابات التوصية الأكاديمية', completed: false },
        { id: `c-${Date.now()}-5`, task: 'تقديم الطلب الإلكتروني الرسمي', completed: false },
      ],
    };

    onAddMilestone(newEntry);
    setSelectedMilestoneId(newEntry.id);
    setShowAddModal(false);
    setNewNotes('');
  };

  return (
    <div id="learner-progress-tracker" className="w-full px-5 py-3 space-y-4 pb-24 text-start">
      {/* Professional Polish Progress Card */}
      <div className="bg-[var(--ab-surface)] p-5 rounded-3xl border border-[var(--ab-border)] shadow-sm space-y-3 ab-panel ">
        <div className="flex justify-between items-center">
          <span className="text-[var(--ab-heading)] text-sm font-bold flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-[var(--ab-accent-text)]" />{publicT('public_your_overall_learning_progress')}</span>
          <span className="text-[var(--ab-accent-text)] font-bold text-sm">
            {overallPercentage}%
          </span>
        </div>

        {/* Progress bar using var(--ab-accent-soft) and slate-100 */}
        <progress className="ab-native-progress ab-native-progress-accent h-2.5 w-full" value={Math.min(100, Math.max(0, overallPercentage))} max={100} aria-label={publicT('public_overall_learning_progress')} />

        <p className="text-xs text-[var(--ab-text-muted)] font-medium">
          {completedChecklistItems}{' '}{publicT('public_of')}{' '}{totalChecklistItems}{' '}{publicT('public_academic_tasks_completed_successfully')}</p>
      </div>

      {/* Push Notification / Instant Updates Alert Box */}
      <div className="bg-[var(--ab-accent)]/10 p-4 rounded-2xl border border-[var(--ab-accent)]/25 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--ab-accent)]/20 flex items-center justify-center text-[var(--ab-heading)] shrink-0">
            <BellRing className="w-4 h-4 text-[var(--ab-heading)]" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--ab-heading)]">{publicT('public_instant_notifications_are_enabled')}</div>
            <div className="text-[11px] text-[var(--ab-text-muted)]">{publicT('public_get_notified_about_new_scholarships_and_approaching_deadlines')}</div>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[var(--ab-primary)] text-[var(--ab-accent-text)] font-bold text-[10px] shrink-0 shadow-2xs ab-inverse ">{publicT('public_live')}</span>
      </div>

      {/* Tracked Scholarships Section Header */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-xs font-bold text-[var(--ab-heading)] flex items-center gap-1">
          <span>{publicT('public_tracked_applications')}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-[var(--ab-primary)]/10 text-[var(--ab-heading)] text-[10px] font-bold">
            {milestones.length}
          </span>
        </h3>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--ab-primary)] hover:bg-[var(--ab-primary-hover)] text-[var(--ab-accent-text)] text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer ab-inverse hover:ab-inverse "
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{publicT('public_add_scholarship')}</span>
        </button>
      </div>

      {/* Horizontal Tabs for Tracked Scholarships */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {milestones.map((m) => {
          const isSelected = m.id === selectedMilestoneId;

          return (
            <button
              key={m.id}
              onClick={() => setSelectedMilestoneId(m.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border active:scale-95 cursor-pointer ${
                isSelected
                  ? 'bg-[var(--ab-primary)] text-[var(--ab-accent-text)] border-[var(--ab-border-brand)] shadow-xs ab-inverse '
                  : 'bg-[var(--ab-surface)] text-[var(--ab-text)] border-[var(--ab-border)] hover:border-[var(--ab-accent)] ab-panel '
              }`}
            >
              <span>{m.country}</span>
              <span>{m.scholarshipTitle}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  isSelected
                    ? 'bg-[var(--ab-accent)] text-[var(--ab-on-accent)] ab-gold '
                    : 'bg-[var(--ab-surface-muted)] text-[var(--ab-text-muted)] ab-panel '
                }`}
              >
                {m.progress}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Application Detailed Pipeline */}
      {activeMilestone && (
        <div className="bg-[var(--ab-surface)] rounded-3xl p-5 border border-[var(--ab-border)] shadow-sm space-y-4 ab-panel ">
          {/* Top Bar of Active Milestone */}
          <div className="flex items-start justify-between gap-2 border-b border-[var(--ab-border)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--ab-heading)]">
                  {activeMilestone.scholarshipTitle}
                </span>
                <span className="text-xs text-[var(--ab-text-muted)]">{activeMilestone.country}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[var(--ab-text-muted)] font-semibold mt-1">
                <span className="flex items-center gap-1 text-[var(--ab-danger-text)] font-bold">
                  <Calendar className="w-3.5 h-3.5" />{publicT('public_deadline_2')}{' '}{activeMilestone.deadline}
                </span>
                <span className="flex items-center gap-1 text-[var(--ab-heading)]">
                  <Clock className="w-3.5 h-3.5" />{publicT('public_stage')}{' '}{activeMilestone.stage}
                </span>
              </div>
            </div>

            {/* Delete tracker button */}
            <button
              onClick={() => onDeleteMilestone(activeMilestone.id)}
              className="p-1.5 text-[var(--ab-text-muted)] hover:text-[var(--ab-danger-text)] hover:bg-[var(--ab-danger-soft)] rounded-lg transition-colors cursor-pointer"
              title={publicT('public_remove_from_tracking')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Quick AI Shortcuts */}
          <div className="p-3 rounded-2xl bg-[var(--ab-accent)]/10 border border-[var(--ab-accent)]/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[var(--ab-heading)] font-bold">
              <Sparkles className="w-4 h-4 text-[var(--ab-accent-text)]" />
              <span>{publicT('public_ai_assistance')}</span>
            </div>
            {onOpenAiLetterForScholarship && (
              <button
                onClick={() => onOpenAiLetterForScholarship(activeMilestone.scholarshipTitle)}
                className="px-3 py-1 bg-[var(--ab-primary)] text-[var(--ab-accent-text)] rounded-xl text-[10px] font-bold hover:bg-[var(--ab-primary-hover)] active:scale-95 transition-all cursor-pointer ab-inverse hover:ab-inverse "
              >{publicT('public_generate_an_ai_motivation_letter')}</button>
            )}
          </div>

          {/* Checklist of Application Requirements */}
          <div>
            <h4 className="text-xs font-bold text-[var(--ab-heading)] mb-2.5 flex items-center justify-between">
              <span>{publicT('public_tasks_and_files_checklist')}</span>
              <span className="text-[10px] text-[var(--ab-text-muted)] font-normal">{publicT('public_click_to_update')}</span>
            </h4>

            <div className="space-y-2">
              {activeMilestone.checklist.map((task) => (
                <div
                  key={task.id}
                  role="checkbox"
                  aria-checked={task.completed}
                  tabIndex={0}
                  onKeyDown={function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleToggleTask(activeMilestone.id, task.id);
                    }
                  }}
                  onClick={() => handleToggleTask(activeMilestone.id, task.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all active:scale-98 ${
                    task.completed
                      ? 'bg-[var(--ab-primary)]/5 border-[var(--ab-border-brand)]/30 text-[var(--ab-heading)] font-semibold'
                      : 'bg-[var(--ab-page)] border-[var(--ab-border)] text-[var(--ab-text)] hover:bg-[var(--ab-surface-muted)]/70 ab-panel '
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-xs">
                    {task.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-[var(--ab-heading)] fill-[var(--ab-primary)]/20 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-[var(--ab-text-muted)] shrink-0" />
                    )}
                    <span className={task.completed ? 'line-through text-[var(--ab-text-muted)]' : ''}>
                      {task.task}
                    </span>
                  </div>

                  {task.completed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ab-primary)]/10 px-2 py-0.5 text-[9px] font-bold text-[var(--ab-heading)]">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />{publicT('public_completed')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Personal Notes Box */}
          <div className="p-3 bg-[var(--ab-page)] rounded-2xl border border-[var(--ab-border)] text-xs ab-panel ">
            <div className="font-bold text-[var(--ab-text)] mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[var(--ab-text-muted)]" />
              <span>{publicT('public_your_private_notes')}</span>
            </div>
            <p className="text-[var(--ab-text-muted)] text-[11px] leading-relaxed">
              {activeMilestone.notes || publicT('public_no_notes_added_yet')}
            </p>
          </div>
        </div>
      )}

      {/* Learner Enrolled Courses Section */}
      <div className="bg-[var(--ab-surface)] rounded-3xl p-5 border border-[var(--ab-border)] shadow-sm space-y-3 ab-panel ">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[var(--ab-heading)] flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[var(--ab-heading)]" />
            <span>{publicT('public_enrolled_preparation_courses')}</span>
          </h3>
          <span className="text-[10px] text-[var(--ab-text-muted)]">{publicT('public_learning_beacon')}</span>
        </div>

        <div className="space-y-2.5">
          {courses.map((course) => (
            <div
              key={course.id}
              className="p-3 rounded-2xl border border-[var(--ab-border)] bg-[var(--ab-page)]/70 hover:bg-[var(--ab-page)] transition-colors flex items-center justify-between gap-3 hover:ab-panel "
            >
              <div className="flex items-center gap-3">
                <img
                  src={course.imageUrl}
                  alt={course.title}
                  className="w-10 h-10 rounded-xl object-cover border border-[var(--ab-border)] shrink-0"
                />
                <div>
                  <h4 className="text-xs font-bold text-[var(--ab-heading)] line-clamp-1">{course.title}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--ab-text-muted)] mt-0.5">
                    <span>{course.provider}</span>
                    <span>•</span>
                    <span>{course.duration}</span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="text-left shrink-0">
                <div className="text-[11px] font-bold text-[var(--ab-heading)] mb-1">
                  {course.progressPercent || 0}%
                </div>
                <progress className="ab-native-progress ab-native-progress-primary h-1.5 w-14" value={Math.min(100, Math.max(0, course.progressPercent || 0))} max={100} aria-label={publicT('public_course_progress_title', { v0: course.title || publicT('public_course') })} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add New Milestone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--ab-surface)] rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-[var(--ab-accent)]/30 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-start ab-panel ">
            <div className="flex items-center justify-between border-b border-[var(--ab-border)] pb-2">
              <h3 className="text-sm font-semibold text-[var(--ab-heading)]">{publicT('public_add_a_scholarship_to_your_tracker')}</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label={publicT('public_close')}
                className="grid min-h-10 min-w-10 place-items-center rounded-xl text-[var(--ab-text-muted)] hover:bg-[var(--ab-surface-muted)] hover:text-[var(--ab-text)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--ab-text)] mb-1">{publicT('public_choose_a_scholarship')}</label>
              <select
                value={newScholarshipId}
                onChange={(e) => setNewScholarshipId(e.target.value)}
                className="w-full py-2.5 px-3 bg-[var(--ab-page)] border border-[var(--ab-border)] rounded-xl text-xs font-semibold text-[var(--ab-heading)] focus:outline-hidden focus:border-[var(--ab-border-brand)] ab-panel "
              >
                {allScholarships.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.countryFlag} {s.title} ({s.country})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--ab-text)] mb-1">{publicT('public_private_notes_or_goals')}</label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
                placeholder={publicT('public_for_example_focus_on_an_ai_masters_program')}
                className="w-full py-2 px-3 bg-[var(--ab-page)] border border-[var(--ab-border)] rounded-xl text-xs text-[var(--ab-heading)] focus:outline-hidden focus:border-[var(--ab-border-brand)] ab-panel "
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleAddNewTracker}
                className="flex-1 py-2.5 bg-[var(--ab-primary)] text-[var(--ab-accent-text)] font-bold text-xs rounded-xl shadow-md hover:bg-[var(--ab-primary-hover)] active:scale-95 transition-all cursor-pointer ab-inverse hover:ab-inverse "
              >{publicT('public_start_tracking_now')}</button>
              <button
                onClick={() => setShowAddModal(false)}
                className="py-2.5 px-4 bg-[var(--ab-surface-muted)] text-[var(--ab-text-muted)] font-bold text-xs rounded-xl hover:bg-[var(--ab-surface-muted)] cursor-pointer ab-panel hover:ab-panel "
              >{publicT('public_cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
