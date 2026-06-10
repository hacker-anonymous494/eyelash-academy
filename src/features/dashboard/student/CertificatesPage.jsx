import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import GlassCard from '@/shared/components/GlassCard';
import PageTransition from '@/shared/components/PageTransition';
import BackgroundBlobs from '@/shared/components/BackgroundBlobs';
import { Link } from 'react-router-dom';

export default function CertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCerts() {
      const { data } = await supabase
        .from('certificates')
        .select('*, courses(title)')
        .eq('student_id', user.id)
        .order('issued_at', { ascending: false });
      setCertificates(data || []);
      setLoading(false);
    }
    fetchCerts();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff6f9] to-[#fff0f4] relative">
      <BackgroundBlobs section="mid" />
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
          <h1 className="text-3xl font-display font-semibold mb-8">My Certificates</h1>
          {loading ? (
            <div className="animate-spin h-10 w-10 border-4 border-brand-rose-200 border-t-brand-rose-600 rounded-full" />
          ) : certificates.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <p className="text-gray-500">No certificates yet. Complete a course to earn your first!</p>
              <Link to="/courses" className="btn-primary mt-4 inline-block">
                Browse Courses
              </Link>
            </GlassCard>
          ) : (
            <div className="grid gap-4">
              {certificates.map((cert) => (
                <GlassCard key={cert.id} className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-semibold">{cert.courses?.title}</h3>
                    <p className="text-sm text-gray-500">Issued {new Date(cert.issued_at).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">Code: {cert.certificate_code}</p>
                  </div>
                  <a
                    href={cert.certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost text-sm"
                  >
                    Download PDF
                  </a>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </PageTransition>
    </div>
  );
}