import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import AdminLayout from './AdminLayout';
import GlassCard from '@/shared/components/GlassCard';
import PrimaryButton from '@/shared/components/PrimaryButton';

export default function AdminCourseEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();

  // Course fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('draft');
  const [modules, setModules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadedCourseId, setLoadedCourseId] = useState(null);

  // Load existing course
  useEffect(() => {
    if (!isNew) {
      const fetchCourse = async () => {
        const { data: course, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .single();
        if (error) {
          console.error('Error fetching course:', error);
          return;
        }
        if (course) {
          setTitle(course.title);
          setSlug(course.slug);
          setDescription(course.description || '');
          setPrice((course.price_cents / 100).toString());
          setStatus(course.status);
          setLoadedCourseId(course.id);

          // Fetch modules with lessons and quizzes (with questions)
          const { data: mods } = await supabase
            .from('modules')
            .select('*, lessons(*, quizzes(*, quiz_questions(*)))')
            .eq('course_id', id)
            .order('position');

          setModules(mods || []);
        }
      };
      fetchCourse();
    }
  }, [id, isNew]);

  // Slug auto‑generation
  useEffect(() => {
    if (!slug && title) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }, [title, slug]);

  // Save course info
  const saveCourse = async () => {
    setSaving(true);
    const courseData = {
      title,
      slug,
      description,
      price_cents: Math.round(parseFloat(price) * 100),
      status,
    };

    let courseId = loadedCourseId || id;
    if (isNew) {
      const { data } = await supabase.from('courses').insert(courseData).select('id').single();
      courseId = data.id;
      setLoadedCourseId(courseId);
      navigate(`/admin/courses/${courseId}`, { replace: true });
    } else {
      await supabase.from('courses').update(courseData).eq('id', courseId);
    }
    setSaving(false);
    return courseId;
  };

  // Add module
  const addModule = () => {
    setModules([...modules, { id: `temp-${Date.now()}`, title: 'New Module', position: modules.length, lessons: [] }]);
  };

  // Update module title
  const updateModule = (idx, field, value) => {
    const updated = [...modules];
    updated[idx][field] = value;
    setModules(updated);
  };

  // Remove module
  const removeModule = (idx) => {
    const updated = [...modules];
    updated.splice(idx, 1);
    setModules(updated);
  };

  // Add lesson to a module
  const addLesson = (modIdx) => {
    const updated = [...modules];
    updated[modIdx].lessons = [
      ...updated[modIdx].lessons,
      {
        id: `temp-${Date.now()}-${Math.random()}`,
        title: 'New Lesson',
        video_url: '',
        position: updated[modIdx].lessons.length,
        quizzes: [], // will be populated after save
      },
    ];
    setModules(updated);
  };

  // Update lesson field
  const updateLesson = (modIdx, lessonIdx, field, value) => {
    const updated = [...modules];
    updated[modIdx].lessons[lessonIdx][field] = value;
    setModules(updated);
  };

  // Remove lesson
  const removeLesson = (modIdx, lessonIdx) => {
    const updated = [...modules];
    updated[modIdx].lessons.splice(lessonIdx, 1);
    setModules(updated);
  };

  // Upload video
  const handleVideoUpload = async (modIdx, lessonIdx, file) => {
    if (!file) return;
    const filePath = `course-${loadedCourseId || 'new'}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('course-videos').upload(filePath, file, { upsert: true });
    if (error) {
      alert('Upload failed: ' + error.message);
      return;
    }
    const { data } = supabase.storage.from('course-videos').getPublicUrl(filePath);
    updateLesson(modIdx, lessonIdx, 'video_url', data.publicUrl);
  };

  // ─── Quiz helpers ────────────────────────────────────
  const ensureQuiz = (modIdx, lessonIdx) => {
    const updated = [...modules];
    const lesson = updated[modIdx].lessons[lessonIdx];
    if (!lesson.quizzes || lesson.quizzes.length === 0) {
      lesson.quizzes = [{
        id: `temp-quiz-${Date.now()}`,
        pass_percentage: 70,
        quiz_questions: [],
      }];
    }
    setModules(updated);
  };

  const updateQuiz = (modIdx, lessonIdx, quizIdx, field, value) => {
    const updated = [...modules];
    updated[modIdx].lessons[lessonIdx].quizzes[quizIdx][field] = value;
    setModules(updated);
  };

  const addQuestion = (modIdx, lessonIdx, quizIdx) => {
    const updated = [...modules];
    const quiz = updated[modIdx].lessons[lessonIdx].quizzes[quizIdx];
    quiz.quiz_questions.push({
      id: `temp-q-${Date.now()}`,
      question_text: '',
      options: ['', '', '', ''],
      correct_option_index: 0,
    });
    setModules(updated);
  };

  const updateQuestion = (modIdx, lessonIdx, quizIdx, qIdx, field, value) => {
    const updated = [...modules];
    const q = updated[modIdx].lessons[lessonIdx].quizzes[quizIdx].quiz_questions[qIdx];
    if (field === 'options') {
      q.options = value; // value is the whole array
    } else {
      q[field] = value;
    }
    setModules(updated);
  };

  const removeQuestion = (modIdx, lessonIdx, quizIdx, qIdx) => {
    const updated = [...modules];
    updated[modIdx].lessons[lessonIdx].quizzes[quizIdx].quiz_questions.splice(qIdx, 1);
    setModules(updated);
  };

  // Save modules, lessons, and quizzes
  const saveModulesAndLessons = async (courseId) => {
    // Delete existing modules (and cascade will remove lessons/quizzes)
    if (!isNew) {
      const { data: existingModules } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', courseId);
      const ids = existingModules?.map(m => m.id) || [];
      if (ids.length > 0) {
        await supabase.from('lessons').delete().in('module_id', ids);
        await supabase.from('modules').delete().eq('course_id', courseId);
      }
    }

    for (const [modIdx, mod] of modules.entries()) {
      // Insert module
      const { data: modData } = await supabase
        .from('modules')
        .insert({
          course_id: courseId,
          title: mod.title,
          position: modIdx,
        })
        .select('id')
        .single();

      if (mod.lessons.length > 0) {
        for (const [lIdx, lesson] of mod.lessons.entries()) {
          // Insert lesson
          const { data: lessonData } = await supabase
            .from('lessons')
            .insert({
              module_id: modData.id,
              title: lesson.title,
              video_url: lesson.video_url,
              position: lIdx,
              has_quiz: lesson.quizzes && lesson.quizzes.length > 0,
            })
            .select('id')
            .single();

          // Insert quiz if exists
          if (lesson.quizzes && lesson.quizzes.length > 0) {
            for (const quiz of lesson.quizzes) {
              const { data: quizData } = await supabase
                .from('quizzes')
                .insert({
                  lesson_id: lessonData.id,
                  pass_percentage: quiz.pass_percentage || 70,
                })
                .select('id')
                .single();

              // Insert questions
              if (quiz.quiz_questions && quiz.quiz_questions.length > 0) {
                await supabase.from('quiz_questions').insert(
                  quiz.quiz_questions.map(q => ({
                    quiz_id: quizData.id,
                    question_text: q.question_text,
                    options: q.options,
                    correct_option_index: q.correct_option_index,
                  }))
                );
              }
            }
          }
        }
      }
    }
  };

  const handleSaveAll = async () => {
    const courseId = await saveCourse();
    if (!courseId) return;
    await saveModulesAndLessons(courseId);
    alert('Course saved successfully!');
    navigate(`/admin/courses/${courseId}`);
  };

  return (
    <AdminLayout>
      <h2 className="text-3xl font-display font-semibold mb-6">{isNew ? 'New Course' : 'Edit Course'}</h2>

      {/* Course info */}
      <GlassCard className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price ($)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2" />
        </div>
      </GlassCard>

      {/* Modules & Lessons & Quizzes */}
      <div className="space-y-6">
        {modules.map((mod, modIdx) => (
          <GlassCard key={mod.id} className="p-6">
            <div className="flex gap-2 items-center mb-4">
              <input
                value={mod.title}
                onChange={(e) => updateModule(modIdx, 'title', e.target.value)}
                className="font-semibold border rounded-lg px-3 py-1 flex-1"
                placeholder="Module Title"
              />
              <button onClick={() => addLesson(modIdx)} className="btn-ghost text-xs px-2 py-1">+ Lesson</button>
              <button onClick={() => removeModule(modIdx)} className="text-red-500 text-sm">Delete</button>
            </div>
            <div className="space-y-3 ml-4">
              {mod.lessons.map((lesson, lessonIdx) => (
                <div key={lesson.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      value={lesson.title}
                      onChange={(e) => updateLesson(modIdx, lessonIdx, 'title', e.target.value)}
                      className="border rounded px-2 py-1 flex-1 min-w-[150px]"
                      placeholder="Lesson title"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleVideoUpload(modIdx, lessonIdx, e.target.files[0])}
                        className="text-xs"
                      />
                      {lesson.video_url && <span className="text-green-600 text-xs">✓ Video</span>}
                      <button onClick={() => removeLesson(modIdx, lessonIdx)} className="text-red-500 text-sm">✕</button>
                    </div>
                  </div>

                  {/* ─── Quiz section ────────────────────────── */}
                  <div className="bg-brand-rose-50/50 rounded-lg p-3 border border-brand-rose-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">📝 Quiz</span>
                      {lesson.quizzes && lesson.quizzes.length > 0 ? (
                        <>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Enabled</span>
                          <button
                            onClick={() => {
                              // Remove quiz
                              const updated = [...modules];
                              updated[modIdx].lessons[lessonIdx].quizzes = [];
                              setModules(updated);
                            }}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remove Quiz
                          </button>
                        </>
                      ) : (
                        <button onClick={() => ensureQuiz(modIdx, lessonIdx)} className="text-xs text-brand-rose-600 hover:underline">
                          + Add Quiz
                        </button>
                      )}
                    </div>

                    {lesson.quizzes && lesson.quizzes.map((quiz, quizIdx) => (
                      <div key={quiz.id} className="space-y-3 ml-2">
                        <div className="flex items-center gap-4">
                          <label className="text-xs">Pass %</label>
                          <input
                            type="number"
                            value={quiz.pass_percentage}
                            onChange={(e) => updateQuiz(modIdx, lessonIdx, quizIdx, 'pass_percentage', parseInt(e.target.value) || 70)}
                            className="w-16 border rounded px-2 py-0.5 text-xs"
                            min="0"
                            max="100"
                          />
                        </div>

                        {/* Questions */}
                        <div className="space-y-3">
                          {quiz.quiz_questions.map((q, qIdx) => (
                            <div key={q.id} className="bg-white rounded-lg p-3 border space-y-2">
                              <div className="flex gap-2 items-center">
                                <input
                                  value={q.question_text}
                                  onChange={(e) => updateQuestion(modIdx, lessonIdx, quizIdx, qIdx, 'question_text', e.target.value)}
                                  className="flex-1 border rounded px-2 py-1 text-sm"
                                  placeholder="Question"
                                />
                                <button onClick={() => removeQuestion(modIdx, lessonIdx, quizIdx, qIdx)} className="text-red-500 text-xs">✕</button>
                              </div>
                              {q.options.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`q_${q.id}_correct`}
                                    checked={q.correct_option_index === optIdx}
                                    onChange={() => updateQuestion(modIdx, lessonIdx, quizIdx, qIdx, 'correct_option_index', optIdx)}
                                    className="accent-brand-rose-600"
                                  />
                                  <input
                                    value={opt}
                                    onChange={(e) => {
                                      const newOptions = [...q.options];
                                      newOptions[optIdx] = e.target.value;
                                      updateQuestion(modIdx, lessonIdx, quizIdx, qIdx, 'options', newOptions);
                                    }}
                                    className="flex-1 border rounded px-2 py-0.5 text-xs"
                                    placeholder={`Option ${optIdx + 1}`}
                                  />
                                </div>
                              ))}
                            </div>
                          ))}
                          <button onClick={() => addQuestion(modIdx, lessonIdx, quizIdx)} className="text-xs text-brand-rose-600 hover:underline">
                            + Add Question
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="flex justify-between mt-6">
        <button onClick={addModule} className="btn-ghost">+ Add Module</button>
        <PrimaryButton onClick={handleSaveAll} loading={saving}>
          Save Course
        </PrimaryButton>
      </div>
    </AdminLayout>
  );
}