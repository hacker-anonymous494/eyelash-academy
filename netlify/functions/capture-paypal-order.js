const { createClient } = require('@supabase/supabase-js');
const { sendEmail, templates } = require('./email');   // ← added

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAYPAL_BASE = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { orderID, courseId } = JSON.parse(event.body);
    const token = event.headers.authorization?.split('Bearer ')[1];
    if (!token) throw new Error('Unauthorized');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid token');

    // Get access token for PayPal
    const auth = Buffer.from(`${process.env.VITE_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
    const tokenRes = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Failed to get PayPal token');

    const accessToken = tokenData.access_token;

    // Capture the PayPal order
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const captureData = await captureRes.json();
    if (!captureRes.ok) throw new Error(captureData.message || 'Capture failed');

    if (captureData.status !== 'COMPLETED') throw new Error('Payment not completed');

    // Fetch course details for email
    const { data: course } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single();

    // Create enrollment
    const { error: enrollError } = await supabase.from('enrollments').insert({
      student_id: user.id,
      course_id: courseId,
      status: 'active',
    });
    if (enrollError) throw new Error(enrollError.message);

    // Create order record (if table exists)
    const amount = captureData.purchase_units[0]?.payments?.captures[0]?.amount;
    if (amount) {
      await supabase.from('orders').insert({
        student_id: user.id,
        course_id: courseId,
        provider: 'paypal',
        provider_session_id: orderID,
        amount_cents: Math.round(parseFloat(amount.value) * 100),
        currency: amount.currency_code,
        status: 'completed',
      }).catch(() => null);
    }

    // ── Send purchase receipt email ──────────────────────────────────────
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      if (profile?.email && course) {
        await sendEmail({
          to: profile.email,
          subject: `Enrollment Confirmed – ${course.title}`,
          html: templates.purchaseReceipt(
            profile.full_name || 'Student',
            course.title,
            amount ? Math.round(parseFloat(amount.value) * 100) : 0
          ),
        });
      }
    } catch (mailErr) {
      console.error('Failed to send purchase email:', mailErr);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};