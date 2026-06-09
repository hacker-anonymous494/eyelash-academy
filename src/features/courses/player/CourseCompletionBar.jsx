import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';

export default function CourseCompletionBar({ courseId, userId, passedCount, totalLessons }) {
  const [certificateUrl, setCertificateUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const allCompleted = passedCount === totalLessons && totalLessons > 0;

  useEffect(() => {
    if (!allCompleted || !userId) return;
    const checkCert = async () => {
      const { data } = await supabase
        .from('certificates')
        .select('certificate_url')
        .eq('student_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      if (data) setCertificateUrl(data.certificate_url);
    };
    checkCert();
  }, [allCompleted, userId, courseId]);

  const handleClaimCertificate = async () => {
    if (loading || certificateUrl) return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/.netlify/functions/generate-certificate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ courseId }),
    });
    if (res.ok) {
      const { url } = await res.json();
      setCertificateUrl(url);
    }
    setLoading(false);
  };

  if (!allCompleted) return null;

  return (
    <div style={{ textAlign: 'center', marginTop: 8 }}>
      {certificateUrl ? (
        <a
          href={certificateUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg,#48c878,#80e8a0)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 100,
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          🎓 View Certificate
        </a>
      ) : (
        <button
          onClick={handleClaimCertificate}
          disabled={loading}
          style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg,#c84070,#f07090)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 100,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          {loading ? 'Generating...' : '🏆 Claim Certificate'}
        </button>
      )}
    </div>
  );
}