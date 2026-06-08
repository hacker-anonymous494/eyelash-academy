// netlify/functions/capture-paypal-order.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { orderID, courseId } = JSON.parse(event.body);
    if (!orderID || !courseId) throw new Error('Missing orderID or courseId');

    // Auth check
    const token = event.headers.authorization?.split('Bearer ')[1];
    if (!token) throw new Error('Unauthorized');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid token');

    // Check existing enrollment (avoid double purchase)
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingEnrollment) {
      // Already enrolled, but payment captured – we still return success (idempotent)
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // Capture the PayPal order (server-to-server)
    const auth = Buffer.from(`${process.env.VITE_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await fetch(`${process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const { access_token } = await tokenResponse.json();
    if (!access_token) throw new Error('Failed to get PayPal access token');

    const captureResponse = await fetch(`${process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });
    const captureData = await captureResponse.json();

    if (captureData.status !== 'COMPLETED') {
      throw new Error('Payment not completed: ' + (captureData.message || ''));
    }

    // Retrieve amount
    const captureAmount = captureData.purchase_units[0].payments.captures[0].amount;
    const amountCents = Math.round(parseFloat(captureAmount.value) * 100);

    // Insert enrollment
    const { error: enrollError } = await supabase
      .from('enrollments')
      .insert({
        student_id: user.id,
        course_id: courseId,
        status: 'active',
      });
    if (enrollError) throw new Error('Enrollment insert failed: ' + enrollError.message);

    // Insert order record
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        student_id: user.id,
        course_id: courseId,
        provider: 'paypal',
        provider_session_id: orderID,
        amount_cents: amountCents,
        currency: captureAmount.currency_code,
        status: 'completed',
      });
    if (orderError) throw new Error('Order insert failed: ' + orderError.message);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('capture-paypal-order error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};