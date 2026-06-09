import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import GlassCard from '@/shared/components/GlassCard';
import GradientText from '@/shared/components/GradientText';
import PageTransition from '@/shared/components/PageTransition';

export default function VerifyCertificatePage() {
  const { code } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function verify() {
      if (!code) {
        setError('No certificate code provided.');
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('certificates')
        .select('*, student:profiles(full_name), course:courses(title)')
        .eq('certificate_code', code.toUpperCase().trim())
        .maybeSingle();

      if (queryError) {
        setError('Could not verify certificate. Please try again.');
      } else if (!data) {
        setError('Certificate not found. The code may be invalid or not yet issued.');
      } else {
        setCertificate(data);
      }
      setLoading(false);
    }
    verify();
  }, [code]);

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <span className="section-tag mb-4">Certificate Verification</span>
          <h1 className="text-3xl md:text-5xl font-display font-semibold mb-4">
            {certificate ? 'Certificate Verified' : 'Verify a Certificate'}
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-rose-200 border-t-brand-rose-600" />
          </div>
        ) : error ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-600 font-semibold mb-2">{error}</p>
            <Link to="/verify" className="text-sm text-brand-rose-600 hover:underline">
              Try another code
            </Link>
          </GlassCard>
        ) : certificate ? (
          <GlassCard className="p-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">✅</div>
              <h2 className="text-2xl font-display font-semibold text-green-700">Valid Certificate</h2>
            </div>

            <div className="border-t border-brand-rose-200/40 pt-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Student</span>
                <span className="font-semibold">{certificate.student?.full_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Course</span>
                <span className="font-semibold">{certificate.course?.title || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Certificate Code</span>
                <span className="font-mono text-sm">{certificate.certificate_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Issued Date</span>
                <span className="font-semibold">
                  {new Date(certificate.issued_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <a
                href={certificate.certificate_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm"
              >
                View Original Certificate
              </a>
            </div>
          </GlassCard>
        ) : (
          /* Search form for manual code entry when no code is in the URL */
          <GlassCard className="p-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const inputCode = e.target.code.value.trim();
                if (inputCode) {
                  window.location.href = `/verify/${inputCode}`;
                }
              }}
            >
              <label className="block text-sm font-medium mb-2">
                Enter Certificate Code
              </label>
              <div className="flex gap-2">
                <input
                  name="code"
                  placeholder="e.g., LUM-FD0E6DC7-2F56EB56"
                  className="flex-1 px-4 py-2 border border-brand-rose-200/40 rounded-xl text-sm"
                  required
                />
                <button type="submit" className="btn-primary text-sm px-6 py-2">
                  Verify
                </button>
              </div>
            </form>
          </GlassCard>
        )}
      </div>
    </PageTransition>
  );
}