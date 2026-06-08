const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { courseId } = JSON.parse(event.body);
    const token = event.headers.authorization?.split('Bearer ')[1];
    if (!token) throw new Error('Unauthorized');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid token');

    // 1. Check all lessons completed
    const { data: modules, error: modError } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', courseId);
    if (modError || !modules.length) throw new Error('Course not found');

    const moduleIds = modules.map(m => m.id);
    const { data: lessons, error: lesError } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds);
    if (lesError) throw new Error('Could not fetch lessons');

    const lessonIds = lessons.map(l => l.id);

    const { data: progress, error: progError } = await supabase
      .from('lesson_progress')
      .select('completed')
      .eq('student_id', user.id)
      .in('lesson_id', lessonIds);

    if (progError) throw new Error('Could not check progress');

    const allCompleted = progress.length === lessonIds.length && progress.every(p => p.completed);
    if (!allCompleted) throw new Error('Not all lessons completed');

    // 2. Check if certificate already issued
    const { data: existing } = await supabase
      .from('certificates')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();
    if (existing) throw new Error('Certificate already issued');

    // 3. Get user and course details
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { data: course } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single();

    // 4. Generate PDF
    const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    const pdfPromise = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
    });

    // Beautiful certificate design
    // Border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#c84070');
    doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50).stroke('#e87090');
    // Title
    doc.fontSize(40).fill('#c84070').text('Certificate of Completion', { align: 'center' });
    doc.moveDown();
    // Name
    doc.fontSize(28).fill('#333').text(profile.full_name, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).fill('#555').text('has successfully completed the', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(24).fill('#c84070').text(course.title, { align: 'center' });
    doc.moveDown();
    // Date
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.fontSize(14).fill('#555').text(`Issued on ${today}`, { align: 'center' });
    doc.moveDown(2);
    // Unique code
    const certCode = `LUM-${courseId.slice(0,8)}-${user.id.slice(0,8)}`.toUpperCase();
    doc.fontSize(10).fill('#999').text(`Certificate Code: ${certCode}`, { align: 'center' });
    // Footer
    doc.moveDown(2);
    doc.fontSize(12).fill('#c84070').text('Lumière Beauty Academy', { align: 'center' });

    doc.end();
    const pdfBuffer = await pdfPromise;

    // 5. Upload to Supabase Storage
    const filename = `certificates/${certCode}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(filename, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (uploadError) throw new Error('Failed to upload certificate: ' + uploadError.message);

    // Get public URL (signed URL would be better, but for MVP we can use public bucket)
    const { data: { publicUrl } } = supabase.storage
      .from('certificates')
      .getPublicUrl(filename);

    // 6. Insert certificate record
    const { error: insertError } = await supabase
      .from('certificates')
      .insert({
        student_id: user.id,
        course_id: courseId,
        certificate_url: publicUrl,
        certificate_code: certCode,
      });
    if (insertError) throw new Error('Failed to save certificate: ' + insertError.message);

    return {
      statusCode: 200,
      body: JSON.stringify({ url: publicUrl, code: certCode }),
    };
  } catch (error) {
    console.error('generate-certificate error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};