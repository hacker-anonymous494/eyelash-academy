const { createClient } = require('@supabase/supabase-js');
const { sendEmail, templates } = require('./email');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { sessionId } = JSON.parse(event.body);
    const token = event.headers.authorization?.split('Bearer ')[1];
    if (!token) throw new Error('Unauthorized');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid token');

    const { data: session, error: sessionErr } = await supabase
      .from('video_call_sessions')
      .select('scheduled_at, profiles!video_call_sessions_student_id_fkey(full_name, email)')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) throw new Error('Session not found');

    if (session.profiles?.email) {
      await sendEmail({
        to: session.profiles.email,
        subject: 'Your 1‑on‑1 Call is Booked',
        html: templates.callBookingConfirmation(
          session.profiles.full_name || 'Student',
          session.scheduled_at
        ),
      });
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};