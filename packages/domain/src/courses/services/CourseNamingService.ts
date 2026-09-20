export class CourseNamingService {
  public static normalize(rawName: string): string {
    if (!rawName) return '';

    let normalized = rawName;

    normalized = normalized.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    normalized = normalized.replace(/!+/g, '');

    const noiseWords = [
      'free course',
      'free certificate',
      'best course',
      'top course',
      'limited time',
      'enroll now',
      'apply now',
      'click here',
      'learn more',
      'online course'
    ];

    for (const term of noiseWords) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      normalized = normalized.replace(regex, '');
    }

    return normalized.replace(/\s+/g, ' ').trim();
  }
}
