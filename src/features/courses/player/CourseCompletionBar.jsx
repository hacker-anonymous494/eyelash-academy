function CourseCompletionBar({ courseId, userId }) {
  const [progressData, setProgressData] = useState({
    completedLessons: 0,
    totalLessons: 0,
    allCompleted: false,
  });
  const [certificateUrl, setCertificateUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch completion status and any existing certificate
  useEffect(() => {
    async function fetchData() {
      // Get modules → lessons
      const { data: modules } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', courseId);
      if (!modules || modules.length === 0) return;

      const moduleIds = modules.map(m => m.id);
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .in('module_id', moduleIds);
      if (!lessons) return;

      const totalLessons = lessons.length;
      const lessonIds = lessons.map(l => l.id);

      // Progress
      const { data: completed } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('student_id', userId)
        .in('lesson_id', lessonIds)
        .eq('completed', true);

      const completedCount = completed?.length || 0;
      const allCompleted = completedCount === totalLessons && totalLessons > 0;

      setProgressData({
        completedLessons: completedCount,
        totalLessons,
        allCompleted,
      });

      // Check if certificate already issued
      if (allCompleted) {
        const { data: cert } = await supabase
          .from('certificates')
          .select('certificate_url')
          .eq('student_id', userId)
          .eq('course_id', courseId)
          .maybeSingle();
        if (cert) setCertificateUrl(cert.certificate_url);
      }
    }
    fetchData();
  }, [courseId, userId]);

  const handleClaimCertificate = async () => {
    if (loading || certificateUrl) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/.netlify/functions/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ courseId }),
      });
      if (response.ok) {
        const { url } = await response.json();
        setCertificateUrl(url);
      }
    } catch (err) {
      console.error('Failed to generate certificate:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!progressData.totalLessons) return null;

  const percent = (progressData.completedLessons / progressData.totalLessons) * 100;

  return (
    <div className="mt-4 p-3 bg-white/50 rounded-xl border border-brand-rose-200/40">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Course progress</span>
        <span>
          {progressData.completedLessons} / {progressData.totalLessons} lessons
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-rose-500 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {progressData.allCompleted && (
        <div className="mt-3 text-center">
          {certificateUrl ? (
            <a
              href={certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm bg-green-600 text-white px-3 py-1.5 rounded-full hover:bg-green-700 transition"
            >
              🎓 View Certificate
            </a>
          ) : (
            <button
              onClick={handleClaimCertificate}
              disabled={loading}
              className="text-sm bg-brand-rose-600 text-white px-3 py-1.5 rounded-full hover:bg-brand-rose-700 transition disabled:opacity-50"
            >
              {loading ? 'Generating...' : '🏆 Claim Certificate'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}