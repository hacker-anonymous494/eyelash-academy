import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import PrimaryButton from '@/shared/components/PrimaryButton';
import { motion } from 'framer-motion';

export default function CourseCompletionBar({ courseId, userId }) {
  const [allCompleted, setAllCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [certUrl, setCertUrl] = useState(null);
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: modules } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', courseId);
      if (!modules) return;
      const moduleIds = modules.map(m => m.id);
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .in('module_id', moduleIds);
      const lessonIds = lessons.map(l => l.id);

      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('completed')
        .eq('student_id', userId)
        .in('lesson_id', lessonIds);

      const allDone = progress.length === lessonIds.length && progress.every(p => p.completed);
      setAllCompleted(allDone);

      // Check if certificate already exists
      if (allDone) {
        const { data: cert } = await supabase
          .from('certificates')
          .select('certificate_url')
          .eq('student_id', userId)
          .eq('course_id', courseId)
          .maybeSingle();
        if (cert) setCertUrl(cert.certificate_url);
      }
      setLoading(false);
    }
    check();
  }, [courseId, userId]);

  const handleGenerate = async () => {
    setGenLoading(true);
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
      setCertUrl(url);
    } else {
      const err = await res.json();
      console.error(err.error);
    }
    setGenLoading(false);
  };

  if (loading) return null;

  if (allCompleted && certUrl) {
    return (
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
        <p className="text-green-700 font-semibold mb-2">🎉 Congratulations! You've completed the course!</p>
        <a href={certUrl} target="_blank" rel="noopener noreferrer" className="text-brand-rose-600 underline">
          Download Certificate
        </a>
      </motion.div>
    );
  }

  if (allCompleted && !certUrl) {
    return (
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-center">
        <p className="text-yellow-700 font-semibold mb-2">All lessons completed!</p>
        <PrimaryButton onClick={handleGenerate} loading={genLoading} className="mx-auto">
          Claim Your Certificate
        </PrimaryButton>
      </motion.div>
    );
  }

  return null;
}