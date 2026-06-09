const { createClient } = require('@supabase/supabase-js');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = process.env.SITE_URL || 'http://localhost:8888';

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

    // 4. Generate PDF using pdf-lib
    const certCode = `LUM-${courseId.slice(0, 8)}-${user.id.slice(0, 8)}`.toUpperCase();
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const verifyUrl = `${SITE_URL}/verify/${certCode}`;

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([792, 612]); // Letter landscape: 11in x 8.5in => 792x612 points
    const width = page.getWidth();   // 792
    const height = page.getHeight(); // 612

    // Embed fonts
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

    // Colors
    const borderColor = rgb(200/255, 64/255, 112/255);
    const lightBorderColor = rgb(232/255, 112/255, 144/255);
    const titleColor = rgb(200/255, 64/255, 112/255);
    const textDark = rgb(51/255, 51/255, 51/255);
    const textLight = rgb(85/255, 85/255, 85/255);
    const textCode = rgb(153/255, 153/255, 153/255);

    // Borders – all coordinates are numbers now
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderColor: borderColor,
      borderWidth: 2,
    });
    page.drawRectangle({
      x: 25,
      y: 25,
      width: width - 50,
      height: height - 50,
      borderColor: lightBorderColor,
      borderWidth: 1,
    });

    // Title
    page.drawText('Certificate of Completion', {
      x: width / 2,
      y: height - 100,
      size: 40,
      font: boldFont,
      color: titleColor,
      textAlign: 'center',
    });

    // Student name
    page.drawText(profile.full_name, {
      x: width / 2,
      y: height - 180,
      size: 28,
      font: normalFont,
      color: textDark,
      textAlign: 'center',
    });

    // Subtitle
    page.drawText('has successfully completed the', {
      x: width / 2,
      y: height - 220,
      size: 16,
      font: normalFont,
      color: textLight,
      textAlign: 'center',
    });

    // Course title
    page.drawText(course.title, {
      x: width / 2,
      y: height - 270,
      size: 24,
      font: boldFont,
      color: titleColor,
      textAlign: 'center',
    });

    // Date
    page.drawText(`Issued on ${today}`, {
      x: width / 2,
      y: height - 320,
      size: 14,
      font: normalFont,
      color: textLight,
      textAlign: 'center',
    });

    // Certificate code
    page.drawText(`Certificate Code: ${certCode}`, {
      x: width / 2,
      y: height - 380,
      size: 10,
      font: monoFont,
      color: textCode,
      textAlign: 'center',
    });

    // Verification link
    page.drawText(`Verify online: ${verifyUrl}`, {
      x: width / 2,
      y: height - 410,
      size: 9,
      font: monoFont,
      color: textLight,
      textAlign: 'center',
      underline: true,
    });

    // Footer
    page.drawText('Lumière Beauty Academy', {
      x: width / 2,
      y: 80,
      size: 12,
      font: boldFont,
      color: titleColor,
      textAlign: 'center',
    });

    const pdfBuffer = await pdfDoc.save();

    // 5. Upload to Supabase Storage
    const filename = `certificates/${certCode}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(filename, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (uploadError) throw new Error('Failed to upload certificate: ' + uploadError.message);

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