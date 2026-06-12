/**
 * AdminCourseEditorPage.jsx
 * Full course editor — preserves all original functionality,
 * redesigned with the new admin design system.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/config/supabase';
import AdminLayout from './AdminLayout';
import { A, Card, Btn, Field, Input, Select, Toast, PageHeader, Spinner } from './adminShared.jsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const tasksToText = tasks => (Array.isArray(tasks) ? tasks : []).join('\n');
const tasksFromText = t => t.split('\n').map(s => s.trim()).filter(Boolean);
const linksToText = links => (Array.isArray(links) ? links : []).map(l => typeof l === 'string' ? l : `${l.label || ''}|${l.url || ''}`).join('\n');
const linksFromText = t => t.split('\n').map(s => s.trim()).filter(Boolean).map(s => {
  const [label, url] = s.split('|');
  return url ? { label: label.trim(), url: url.trim() } : s;
});
const newLesson = (pos) => ({ id: `new_${Date.now()}_${pos}`, title: 'Untitled Lesson', video_url: null, duration_seconds: 0, free_preview: false, position: pos, summary: '', tasks: [], helpful_links: [], quizzes: [] });
const newQuestion = () => ({ id: `nq_${Date.now()}`, question_text: '', options: ['', '', '', ''], correct_option_index: 0 });

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children, collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card style={{ overflow: 'hidden', marginBottom: 16 }}>
      <button onClick={() => collapsible && setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', background: 'rgba(200,64,112,0.03)', border: 'none',
        borderBottom: open ? `1px solid ${A.cardBorder}` : 'none', cursor: collapsible ? 'pointer' : 'default',
        fontFamily: A.fontDisplay, fontSize: 18, fontWeight: 600, color: A.textPrimary,
      }}>
        {title}
        {collapsible && <span style={{ fontSize: 16, color: A.textMuted, transition: 'transform 0.2s', display: 'flex', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Question editor ──────────────────────────────────────────────────────────
function QuestionEditor({ q, qIdx, onUpdate, onRemove }) {
  return (
    <div style={{ background: 'rgba(200,64,112,0.03)', border: `1px solid ${A.roseBorder}`, borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontFamily: A.fontBody, fontSize: 11, fontWeight: 700, color: A.textMuted, flexShrink: 0, marginTop: 12 }}>Q{qIdx + 1}</span>
        <Input value={q.question_text} onChange={e => onUpdate('question_text', e.target.value)} placeholder={`Question ${qIdx + 1}`} />
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: A.red, fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 8 }}>×</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingLeft: 28 }}>
        {q.options.map((opt, optIdx) => (
          <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="radio" name={`q_${q.id}_correct`} checked={q.correct_option_index === optIdx} onChange={() => onUpdate('correct_option_index', optIdx)}
              style={{ accentColor: A.rose, flexShrink: 0 }} />
            <input value={opt} onChange={e => { const opts = [...q.options]; opts[optIdx] = e.target.value; onUpdate('options', opts); }}
              placeholder={`Option ${optIdx + 1}${optIdx === 0 ? ' (select radio = correct answer)' : ''}`}
              style={{ flex: 1, fontFamily: A.fontBody, fontSize: 13, color: A.textPrimary, background: 'white', border: `1px solid ${A.cardBorder}`, borderRadius: 7, padding: '6px 10px', outline: 'none' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Lesson editor ────────────────────────────────────────────────────────────
function LessonEditor({ lesson, lessonIdx, modIdx, onUpdate, onRemove, onVideoUpload, uploading }) {
  const [openSection, setOpenSection] = useState('main');

  const updateQ = (quizIdx, qIdx, field, val) => {
    const q = JSON.parse(JSON.stringify(lesson.quizzes));
    q[quizIdx].quiz_questions[qIdx][field] = val;
    onUpdate('quizzes', q);
  };
  const removeQ = (quizIdx, qIdx) => {
    const q = JSON.parse(JSON.stringify(lesson.quizzes));
    q[quizIdx].quiz_questions.splice(qIdx, 1);
    onUpdate('quizzes', q);
  };
  const addQ = (quizIdx) => {
    const q = JSON.parse(JSON.stringify(lesson.quizzes));
    q[quizIdx].quiz_questions.push(newQuestion());
    onUpdate('quizzes', q);
  };
  const addQuiz = () => {
    onUpdate('quizzes', [{ id: `nquiz_${Date.now()}`, pass_percentage: 70, quiz_questions: [newQuestion()] }]);
  };

  const tabs = [
    { key: 'main', label: 'Details' },
    { key: 'content', label: 'Content' },
    { key: 'quiz', label: `Quiz ${lesson.quizzes?.length ? '✓' : ''}` },
  ];

  return (
    <div style={{ background: 'white', border: `1px solid ${A.cardBorder}`, borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
      {/* Lesson header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(200,64,112,0.03)', borderBottom: `1px solid ${A.cardBorder}` }}>
        <span style={{ fontFamily: A.fontBody, fontSize: 11, fontWeight: 700, color: A.textMuted, flexShrink: 0 }}>#{lessonIdx + 1}</span>
        <input value={lesson.title} onChange={e => onUpdate('title', e.target.value)}
          style={{ flex: 1, fontFamily: A.fontBody, fontSize: 14, fontWeight: 600, color: A.textPrimary, background: 'none', border: 'none', outline: 'none' }}
          placeholder="Lesson title" />
        {lesson.video_url && <span style={{ fontFamily: A.fontBody, fontSize: 11, color: A.green, flexShrink: 0 }}>✓ Video</span>}
        <label style={{ cursor: 'pointer', flexShrink: 0 }}>
          <span style={{ fontFamily: A.fontBody, fontSize: 11, color: A.blue, border: `1px solid ${A.blue}22`, borderRadius: 100, padding: '3px 10px' }}>
            {uploading ? '...' : '↑ Video'}
          </span>
          <input type="file" accept="video/*" onChange={e => onVideoUpload(e.target.files[0])} style={{ display: 'none' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: A.fontBody, fontSize: 11, color: A.textMuted, cursor: 'pointer', flexShrink: 0 }}>
          <input type="checkbox" checked={lesson.free_preview} onChange={e => onUpdate('free_preview', e.target.checked)} style={{ accentColor: A.rose }} /> Free
        </label>
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: A.red, fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${A.cardBorder}` }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setOpenSection(tab.key)} style={{
            flex: 1, padding: '8px 0', border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: A.fontBody, fontSize: 12, fontWeight: 500,
            color: openSection === tab.key ? A.rose : A.textMuted,
            borderBottom: openSection === tab.key ? `2px solid ${A.rose}` : '2px solid transparent',
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ padding: '14px 16px' }}>
        {openSection === 'main' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Duration (seconds)">
              <Input type="number" value={lesson.duration_seconds || 0} onChange={e => onUpdate('duration_seconds', parseInt(e.target.value) || 0)} />
            </Field>
            <Field label="Position">
              <Input type="number" value={lesson.position} onChange={e => onUpdate('position', parseInt(e.target.value) || 0)} />
            </Field>
          </div>
        )}
        {openSection === 'content' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Summary">
              <Input value={lesson.summary || ''} onChange={e => onUpdate('summary', e.target.value)} rows={3} placeholder="Brief lesson summary…" />
            </Field>
            <Field label="Tasks" hint="One per line">
              <Input value={tasksToText(lesson.tasks)} onChange={e => onUpdate('tasks', tasksFromText(e.target.value))} rows={3} placeholder="Watch video&#10;Take notes&#10;Complete quiz" style={{ fontFamily: A.fontMono, fontSize: 12 }} />
            </Field>
            <Field label="Helpful Links" hint="Format: Label|URL or just URL, one per line">
              <Input value={linksToText(lesson.helpful_links)} onChange={e => onUpdate('helpful_links', linksFromText(e.target.value))} rows={2} placeholder="Official Docs|https://...&#10;https://example.com" style={{ fontFamily: A.fontMono, fontSize: 12 }} />
            </Field>
          </div>
        )}
        {openSection === 'quiz' && (
          <div>
            {!lesson.quizzes?.length ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontFamily: A.fontBody, fontSize: 13, color: A.textMuted, marginBottom: 12 }}>No quiz for this lesson yet.</p>
                <Btn variant="ghost" size="sm" onClick={addQuiz}>+ Add Quiz</Btn>
              </div>
            ) : lesson.quizzes.map((quiz, quizIdx) => (
              <div key={quiz.id || quizIdx}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Field label="Pass %">
                    <input type="number" value={quiz.pass_percentage} min={0} max={100}
                      onChange={e => { const q = JSON.parse(JSON.stringify(lesson.quizzes)); q[quizIdx].pass_percentage = parseInt(e.target.value) || 70; onUpdate('quizzes', q); }}
                      style={{ width: 72, fontFamily: A.fontBody, fontSize: 13, border: `1px solid ${A.cardBorder}`, borderRadius: 8, padding: '7px 10px', outline: 'none' }} />
                  </Field>
                  <button onClick={() => onUpdate('quizzes', [])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: A.red, fontFamily: A.fontBody, fontSize: 12 }}>Remove Quiz</button>
                </div>
                {(quiz.quiz_questions || []).map((q, qIdx) => (
                  <QuestionEditor key={q.id || qIdx} q={q} qIdx={qIdx} onUpdate={(f, v) => updateQ(quizIdx, qIdx, f, v)} onRemove={() => removeQ(quizIdx, qIdx)} />
                ))}
                <Btn variant="ghost" size="sm" onClick={() => addQ(quizIdx)}>+ Add Question</Btn>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AdminCourseEditorPage ────────────────────────────────────────────────────
export default function AdminCourseEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('draft');
  const [modules, setModules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState({}); // { `${modIdx}_${lessonIdx}`: bool }
  const [loadedCourseId, setLoadedCourseId] = useState(null);

  useEffect(() => {
    if (!isNew) {
      supabase.from('courses').select('*').eq('id', id).single().then(({ data: course }) => {
        if (course) {
          setTitle(course.title); setSlug(course.slug); setDescription(course.description || '');
          setPrice((course.price_cents / 100).toString()); setStatus(course.status); setLoadedCourseId(course.id);
          supabase.from('modules').select('*, lessons(*, quizzes(*, quiz_questions(*)))').eq('course_id', id).order('position').then(({ data: mods }) => {
            setModules((mods || []).map(m => ({ ...m, lessons: (m.lessons || []).sort((a, b) => a.position - b.position).map(l => ({ ...l, summary: l.summary || '', tasks: l.tasks || [], helpful_links: l.helpful_links || [], quizzes: l.quizzes || [] })) })));
          });
        }
      });
    }
  }, [id, isNew]);

  useEffect(() => {
    if (!slug && title) setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  }, [title, slug]);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const saveCourse = async () => {
    const courseData = { title, slug, description, price_cents: Math.round(parseFloat(price) * 100) || 0, status };
    if (isNew) {
      const { data, error } = await supabase.from('courses').insert(courseData).select().single();
      if (error) throw error;
      setLoadedCourseId(data.id);
      navigate(`/admin/courses/${data.id}`, { replace: true });
      return data.id;
    } else {
      const { error } = await supabase.from('courses').update(courseData).eq('id', id);
      if (error) throw error;
      return id;
    }
  };

  const saveModulesAndLessons = async (courseId) => {
    for (let mi = 0; mi < modules.length; mi++) {
      const mod = modules[mi];
      let modId = mod.id;
      if (String(modId).startsWith('new_')) {
        const { data: nm } = await supabase.from('modules').insert({ course_id: courseId, title: mod.title, position: mi }).select().single();
        modId = nm.id;
        const updated = [...modules]; updated[mi] = { ...updated[mi], id: modId }; setModules(updated);
      } else {
        await supabase.from('modules').update({ title: mod.title, position: mi }).eq('id', modId);
      }
      for (let li = 0; li < (mod.lessons || []).length; li++) {
        const lesson = mod.lessons[li];
        const lessonData = { module_id: modId, title: lesson.title, video_url: lesson.video_url, duration_seconds: lesson.duration_seconds || 0, free_preview: lesson.free_preview || false, position: li, summary: lesson.summary || '', tasks: lesson.tasks || [], helpful_links: lesson.helpful_links || [] };
        let lessonId = lesson.id;
        if (String(lessonId).startsWith('new_')) {
          const { data: nl } = await supabase.from('lessons').insert(lessonData).select().single();
          lessonId = nl.id;
        } else {
          await supabase.from('lessons').update(lessonData).eq('id', lessonId);
        }
        // Save quiz
        if (lesson.quizzes?.length) {
          const quiz = lesson.quizzes[0];
          let quizId = quiz.id;
          if (String(quizId).startsWith('nquiz_')) {
            const { data: nq } = await supabase.from('quizzes').insert({ lesson_id: lessonId, pass_percentage: quiz.pass_percentage }).select().single();
            quizId = nq.id;
          } else {
            await supabase.from('quizzes').update({ pass_percentage: quiz.pass_percentage }).eq('id', quizId);
          }
          for (const q of (quiz.quiz_questions || [])) {
            const qData = { quiz_id: quizId, question_text: q.question_text, options: q.options, correct_option_index: q.correct_option_index };
            if (String(q.id).startsWith('nq_')) {
              await supabase.from('quiz_questions').insert(qData);
            } else {
              await supabase.from('quiz_questions').update(qData).eq('id', q.id);
            }
          }
        } else if (!String(lesson.id).startsWith('new_')) {
          // Remove existing quiz if lesson has quizzes=[]]
          const { data: existingQ } = await supabase.from('quizzes').select('id').eq('lesson_id', lessonId);
          if (existingQ?.length) {
            for (const eq of existingQ) {
              await supabase.from('quiz_questions').delete().eq('quiz_id', eq.id);
              await supabase.from('quizzes').delete().eq('id', eq.id);
            }
          }
        }
      }
    }
  };

  const handleSaveAll = async () => {
    if (!title || !slug || !price) { showToast('Title, slug, and price are required.', 'error'); return; }
    setSaving(true);
    try {
      const cId = await saveCourse();
      if (!isNew || loadedCourseId) await saveModulesAndLessons(cId || loadedCourseId);
      showToast('Course saved successfully! ✓');
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
    setSaving(false);
  };

  const handleVideoUpload = async (modIdx, lessonIdx, file) => {
    if (!file) return;
    const key = `${modIdx}_${lessonIdx}`;
    setUploading(p => ({ ...p, [key]: true }));
    try {
      const path = `course-videos/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { error: uploadErr } = await supabase.storage.from('course-videos').upload(path, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('course-videos').getPublicUrl(path);
      const updated = [...modules];
      updated[modIdx].lessons[lessonIdx].video_url = publicUrl;
      setModules(updated);
      showToast('Video uploaded!');
    } catch (err) { showToast(`Upload failed: ${err.message}`, 'error'); }
    setUploading(p => ({ ...p, [key]: false }));
  };

  const addModule = () => {
    setModules(p => [...p, { id: `new_${Date.now()}`, title: 'New Module', position: p.length, lessons: [] }]);
  };
  const removeModule = (mi) => setModules(p => p.filter((_, i) => i !== mi));
  const updateModule = (mi, field, val) => setModules(p => p.map((m, i) => i === mi ? { ...m, [field]: val } : m));
  const addLesson = (mi) => setModules(p => p.map((m, i) => i === mi ? { ...m, lessons: [...m.lessons, newLesson(m.lessons.length)] } : m));
  const removeLesson = (mi, li) => setModules(p => p.map((m, i) => i === mi ? { ...m, lessons: m.lessons.filter((_, j) => j !== li) } : m));
  const updateLesson = (mi, li, field, val) => setModules(p => p.map((m, i) => i === mi ? { ...m, lessons: m.lessons.map((l, j) => j === li ? { ...l, [field]: val } : l) } : m));

  return (
    <AdminLayout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <PageHeader
          title={isNew ? 'New Course' : 'Edit Course'}
          subtitle={isNew ? 'Create a new course with modules, lessons, and quizzes.' : `Editing: ${title}`}
          action={
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="ghost" onClick={() => navigate('/admin/courses')}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSaveAll} loading={saving}>
                {saving ? 'Saving…' : '✓ Save Course'}
              </Btn>
            </div>
          }
        />

        {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}

        {/* Course info */}
        <Section title="Course Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Title" required>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Professional Eyelash Extension Masterclass" />
            </Field>
            <Field label="Slug" required hint="Auto-generated from title">
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="professional-eyelash-masterclass" />
            </Field>
            <Field label="Price (USD)" required>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="297" />
            </Field>
            <Field label="Status">
              <Select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </Field>
          </div>
          <Field label="Description" style={{ marginTop: 14 }}>
            <Input value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What will students learn?" />
          </Field>
        </Section>

        {/* Modules */}
        <div>
          {modules.map((mod, mi) => (
            <Section key={mod.id} collapsible defaultOpen={mi === 0}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                  <input value={mod.title} onChange={e => { e.stopPropagation(); updateModule(mi, 'title', e.target.value); }} onClick={e => e.stopPropagation()}
                    style={{ flex: 1, fontFamily: A.fontDisplay, fontSize: 18, fontWeight: 600, background: 'transparent', border: 'none', outline: 'none', color: A.textPrimary }} />
                  <span style={{ fontFamily: A.fontBody, fontSize: 12, color: A.textMuted }}>{mod.lessons.length} lessons</span>
                  <button onClick={e => { e.stopPropagation(); if (window.confirm('Delete this module and all its lessons?')) removeModule(mi); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: A.red, fontSize: 16, lineHeight: 1 }}>×</button>
                </div>
              }
            >
              {(mod.lessons || []).map((lesson, li) => (
                <LessonEditor key={lesson.id} lesson={lesson} lessonIdx={li} modIdx={mi}
                  onUpdate={(f, v) => updateLesson(mi, li, f, v)}
                  onRemove={() => removeLesson(mi, li)}
                  onVideoUpload={(file) => handleVideoUpload(mi, li, file)}
                  uploading={uploading[`${mi}_${li}`]}
                />
              ))}
              <div style={{ marginTop: 10 }}>
                <Btn variant="ghost" size="sm" onClick={() => addLesson(mi)}>+ Add Lesson</Btn>
              </div>
            </Section>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingBottom: 32 }}>
          <Btn variant="ghost" onClick={addModule}>+ Add Module</Btn>
          <Btn variant="primary" onClick={handleSaveAll} loading={saving} size="lg">
            {saving ? 'Saving…' : '✓ Save All Changes'}
          </Btn>
        </div>
      </div>
    </AdminLayout>
  );
}