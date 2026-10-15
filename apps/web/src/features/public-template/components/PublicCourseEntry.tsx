import type { Course } from '../types';
import { CourseStudyRoomView } from './CourseStudyRoomView';
import { OwnerCourseDetail } from './OwnerCourseDetail';

type Props = {
  course: Course;
  dataMode: 'api' | 'prototype';
  isStudying: boolean;
  onBack: () => void;
  onStartStudy: () => void;
  onStopStudy: () => void;
  onRestrictedAction: (message?: string) => void;
};

/** Stored preview flags cannot select a prototype room when live data is active. */
export function PublicCourseEntry(props: Props) {
  if (props.dataMode === 'prototype' && props.isStudying) {
    return (
      <CourseStudyRoomView
        course={props.course}
        onBack={props.onStopStudy}
        onRestrictedAction={props.onRestrictedAction}
      />
    );
  }
  return (
    <OwnerCourseDetail
      course={props.course}
      dataMode={props.dataMode}
      track={props.course.accessType === 'PAID' ? 'paid' : 'native'}
      onBack={props.onBack}
      onStartStudy={props.dataMode === 'prototype' ? props.onStartStudy : undefined}
    />
  );
}
