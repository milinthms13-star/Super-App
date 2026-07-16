import React, { useState, useEffect } from 'react';
import * as tutorService from '../../services/tutorService';
import './PersonalTutor.css';

const SUBJECTS = [
  // Programming
  'JavaScript',
  'Python',
  'React',
  'Data Structures',
  
  // CA (Chartered Accountancy)
  'CA Foundation',
  'CA Intermediate',
  'CA Final',
  
  // Civil Services
  'Class 5-7',
  'Class 8-10',
  'Class 11-12',
  'UPSC Prelims',
  'UPSC Mains',
  
  // Business
  'Accounting',
  'Marketing',
  'Product Management',
];

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

const INTERVIEW_ROLES = [
  'Software Developer',
  'Data Scientist',
  'Product Manager',
  'Marketing Manager',
  'UI/UX Designer',
  'Accountant',
];

const PersonalTutor = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Dashboard state
  const [dashboardData, setDashboardData] = useState(null);

  // Session state
  const [sessionForm, setSessionForm] = useState({
    subject: 'JavaScript',
    topic: '',
    difficulty: 'beginner',
    learningGoal: '',
  });
  const [currentSession, setCurrentSession] = useState(null);
  const [lessonProgress, setLessonProgress] = useState({});

  // Quiz state
  const [quiz, setQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);

  // Interview state
  const [interviewForm, setInterviewForm] = useState({
    role: 'Software Developer',
    level: 'beginner',
    focusAreas: '',
    questionCount: 5,
  });
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewResponse, setInterviewResponse] = useState('');
  const [interviewEvaluation, setInterviewEvaluation] = useState(null);

  // Progress analytics state
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const data = await tutorService.fetchDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setMessage('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const data = await tutorService.startSession(sessionForm);
      setCurrentSession(data.session);
      setActiveTab('lesson');
      setMessage('Session started! Begin your learning journey.');
    } catch (error) {
      console.error('Error starting session:', error);
      setMessage('Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordProgress = async (sectionTitle, sectionIndex) => {
    if (!currentSession) return;

    const comprehensionScore = lessonProgress[sectionIndex] || 0;
    const timeSpent = 15; // Default 15 minutes per section

    setLoading(true);
    try {
      await tutorService.recordProgress({
        sessionId: currentSession.sessionId,
        lessonSection: sectionTitle,
        timeSpent,
        comprehensionScore,
        notes: '',
      });
      setMessage(`Progress recorded for: ${sectionTitle}`);
    } catch (error) {
      console.error('Error recording progress:', error);
      setMessage('Failed to record progress');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!currentSession) {
      setMessage('Please start a learning session first');
      return;
    }

    setLoading(true);
    setQuizResult(null);
    setQuizAnswers({});
    try {
      const data = await tutorService.generateQuiz({
        sessionId: currentSession.sessionId,
        questionCount: 10,
        difficulty: currentSession.difficulty,
      });
      setQuiz(data.quiz);
      setActiveTab('quiz');
      setMessage('Quiz generated! Test your knowledge.');
    } catch (error) {
      console.error('Error generating quiz:', error);
      setMessage('Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizAnswerChange = (questionId, answerIndex) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    if (!quiz || !currentSession) return;

    // Prepare answers with question data
    const formattedAnswers = quiz.questions.map(q => ({
      questionId: q.id,
      selectedAnswer: quizAnswers[q.id] ?? -1,
      question: q,
    }));

    setLoading(true);
    try {
      const data = await tutorService.submitQuiz({
        sessionId: currentSession.sessionId,
        quizId: quiz.quizId,
        answers: formattedAnswers,
      });
      setQuizResult(data.result);
      setMessage(data.insight);
      await fetchDashboard();
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setMessage('Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInterviewQuestions = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCurrentQuestionIndex(0);
    setInterviewResponse('');
    setInterviewEvaluation(null);
    try {
      const data = await tutorService.generateInterviewQuestions(interviewForm);
      setInterviewQuestions(data.questions);
      setActiveTab('interview');
      setMessage('Interview questions generated!');
    } catch (error) {
      console.error('Error generating interview questions:', error);
      setMessage('Failed to generate interview questions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitInterviewResponse = async (e) => {
    e.preventDefault();
    if (!interviewQuestions[currentQuestionIndex] || !interviewResponse.trim()) {
      setMessage('Please provide a response');
      return;
    }

    const question = interviewQuestions[currentQuestionIndex];
    setLoading(true);
    try {
      const data = await tutorService.submitInterviewPractice({
        role: interviewForm.role,
        question: question.question,
        response: interviewResponse,
        timeSpent: 300,
      });
      setInterviewEvaluation(data.evaluation);
      setMessage(data.insight);
      await fetchDashboard();
    } catch (error) {
      console.error('Error submitting interview response:', error);
      setMessage('Failed to evaluate response');
    } finally {
      setLoading(false);
    }
  };

  const handleNextInterviewQuestion = () => {
    if (currentQuestionIndex < interviewQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setInterviewResponse('');
      setInterviewEvaluation(null);
    }
  };

  const handleCompleteSession = async () => {
    if (!currentSession) return;

    setLoading(true);
    try {
      const data = await tutorService.completeSession(currentSession.sessionId);
      setMessage(`Session completed! ${data.recommendation?.reason || ''}`);
      setCurrentSession(null);
      setActiveTab('dashboard');
      await fetchDashboard();
    } catch (error) {
      console.error('Error completing session:', error);
      setMessage('Failed to complete session');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await tutorService.fetchAnalytics({
        days: 30,
        subject: currentSession?.subject,
      });
      setAnalyticsData(data);
      setActiveTab('analytics');
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setMessage('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = interviewQuestions[currentQuestionIndex];

  return (
    <div className="tutor-container">
      <header className="tutor-header">
        <div>
          <h1>🎓 Personal Tutor</h1>
          <p>Adaptive learning powered by AI • Progress tracking • Interview prep</p>
        </div>
      </header>

      {message && (
        <div className={`tutor-message ${message.includes('Failed') ? 'error' : 'success'}`}>
          {message}
          <button onClick={() => setMessage('')}>✕</button>
        </div>
      )}

      <nav className="tutor-tabs">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={activeTab === 'learn' ? 'active' : ''}
          onClick={() => setActiveTab('learn')}
        >
          📚 Start Learning
        </button>
        <button
          className={activeTab === 'lesson' ? 'active' : ''}
          onClick={() => setActiveTab('lesson')}
          disabled={!currentSession}
        >
          📖 Lesson
        </button>
        <button
          className={activeTab === 'quiz' ? 'active' : ''}
          onClick={() => setActiveTab('quiz')}
          disabled={!quiz}
        >
          ✅ Quiz
        </button>
        <button
          className={activeTab === 'interview' ? 'active' : ''}
          onClick={() => setActiveTab('interview')}
        >
          💼 Interview Prep
        </button>
        <button
          className={activeTab === 'analytics' ? 'active' : ''}
          onClick={handleFetchAnalytics}
        >
          📈 Analytics
        </button>
      </nav>

      <main className="tutor-content">
        {activeTab === 'dashboard' && (
          <div className="tutor-dashboard">
            <h2>Your Learning Dashboard</h2>
            {loading ? (
              <p>Loading dashboard...</p>
            ) : dashboardData ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Total Sessions</h3>
                    <p className="stat-value">{dashboardData.stats?.totalSessions || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Time Spent</h3>
                    <p className="stat-value">{Math.round((dashboardData.stats?.totalTimeSpent || 0) / 60)}h</p>
                  </div>
                  <div className="stat-card">
                    <h3>Avg Quiz Score</h3>
                    <p className="stat-value">{dashboardData.stats?.avgQuizScore || 0}%</p>
                  </div>
                  <div className="stat-card">
                    <h3>Interview Score</h3>
                    <p className="stat-value">{dashboardData.stats?.avgInterviewScore || 0}%</p>
                  </div>
                </div>

                {dashboardData.topWeakAreas && dashboardData.topWeakAreas.length > 0 && (
                  <div className="weak-areas-section">
                    <h3>Areas to Strengthen</h3>
                    <div className="weak-areas-list">
                      {dashboardData.topWeakAreas.map((area, idx) => (
                        <span key={idx} className="weak-area-tag">{area}</span>
                      ))}
                    </div>
                  </div>
                )}

                {dashboardData.recentSessions && dashboardData.recentSessions.length > 0 && (
                  <div className="recent-section">
                    <h3>Recent Sessions</h3>
                    <div className="sessions-list">
                      {dashboardData.recentSessions.map(session => (
                        <div key={session.sessionId} className="session-card">
                          <h4>{session.subject}: {session.topic}</h4>
                          <p>{session.difficulty} • {session.status}</p>
                          <small>{new Date(session.startedAt).toLocaleDateString()}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p>Start your first learning session to see your progress!</p>
            )}
          </div>
        )}

        {activeTab === 'learn' && (
          <div className="tutor-start">
            <h2>Start a New Learning Session</h2>
            <form onSubmit={handleStartSession} className="tutor-form">
              <div className="form-group">
                <label>Subject</label>
                <select
                  value={sessionForm.subject}
                  onChange={(e) => setSessionForm({ ...sessionForm, subject: e.target.value })}
                  required
                >
                  {SUBJECTS.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Topic</label>
                <input
                  type="text"
                  value={sessionForm.topic}
                  onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
                  placeholder="e.g., Async Programming, Closures, etc."
                  required
                />
              </div>

              <div className="form-group">
                <label>Difficulty Level</label>
                <select
                  value={sessionForm.difficulty}
                  onChange={(e) => setSessionForm({ ...sessionForm, difficulty: e.target.value })}
                >
                  {DIFFICULTY_LEVELS.map(level => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Learning Goal (Optional)</label>
                <textarea
                  value={sessionForm.learningGoal}
                  onChange={(e) => setSessionForm({ ...sessionForm, learningGoal: e.target.value })}
                  placeholder="What do you want to achieve in this session?"
                  rows="3"
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Starting...' : '🚀 Start Learning Session'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'lesson' && currentSession && (
          <div className="tutor-lesson">
            <div className="lesson-header">
              <div>
                <h2>{currentSession.lessonContent.title}</h2>
                <p>Difficulty: {currentSession.difficulty} • Estimated: {currentSession.lessonContent.estimatedTime}min</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={handleGenerateQuiz} className="btn-secondary">
                  📝 Take Quiz (After Learning)
                </button>
                <button onClick={handleCompleteSession} className="btn-success">
                  ✅ Complete Session
                </button>
              </div>
            </div>

            {currentSession.lessonContent.introduction && (
              <div className="lesson-introduction">
                <h3>📚 Introduction</h3>
                <p>{currentSession.lessonContent.introduction}</p>
              </div>
            )}

            {currentSession.lessonContent.prerequisites && currentSession.lessonContent.prerequisites.length > 0 && (
              <div className="prerequisites">
                <strong>📋 Prerequisites:</strong> {currentSession.lessonContent.prerequisites.join(', ')}
              </div>
            )}

            <div className="lesson-sections">
              {currentSession.lessonContent.sections.map((section, idx) => (
                <div key={idx} className="lesson-section">
                  <h3>{section.title}</h3>
                  <p className="section-meta">
                    {section.type} • {section.duration} min
                  </p>
                  
                  <div className="section-content">
                    {typeof section.content === 'string' ? (
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
                        {section.content}
                      </div>
                    ) : Array.isArray(section.content) ? (
                      section.content.map((item, i) => (
                        <div key={i} className="content-item">
                          <h4>{item.name || item.title}</h4>
                          <p>{item.description}</p>
                        </div>
                      ))
                    ) : null}
                  </div>

                  {section.examples && section.examples.length > 0 && (
                    <div className="examples">
                      <strong>💡 Examples:</strong>
                      {section.examples.map((ex, i) => (
                        <div key={i} className="example">
                          {typeof ex === 'string' ? ex : (
                            <>
                              <strong>{ex.title || ex.scenario}:</strong>
                              <p>{ex.description || ex.analysis}</p>
                              {ex.explanation && <p><em>Why? {ex.explanation}</em></p>}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="comprehension-check">
                    <label>
                      How well do you understand this section? (0-100)
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={lessonProgress[idx] || 0}
                        onChange={(e) => setLessonProgress({
                          ...lessonProgress,
                          [idx]: Number(e.target.value),
                        })}
                      />
                      <span>{lessonProgress[idx] || 0}%</span>
                    </label>
                    <button
                      onClick={() => handleRecordProgress(section.title, idx)}
                      className="btn-small"
                    >
                      Save Progress
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {currentSession.lessonContent.keyTakeaways && currentSession.lessonContent.keyTakeaways.length > 0 && (
              <div className="key-takeaways">
                <h3>🎯 Key Takeaways</h3>
                <ul>
                  {currentSession.lessonContent.keyTakeaways.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {currentSession.lessonContent.practiceQuestions && (
              <div className="practice-questions">
                <h3>✍️ Practice Questions (Think About These)</h3>
                <ol>
                  {currentSession.lessonContent.practiceQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </div>
            )}

            {currentSession.lessonContent.realWorldApplication && (
              <div className="real-world">
                <h3>🌍 Real World Application</h3>
                <p>{currentSession.lessonContent.realWorldApplication}</p>
              </div>
            )}

            {currentSession.lessonContent.nextTopic && (
              <div className="next-topic">
                <strong>Next Topic:</strong> {currentSession.lessonContent.nextTopic}
              </div>
            )}

            <div className="lesson-actions">
              <button onClick={handleGenerateQuiz} className="btn-primary">
                🎯 Ready for Quiz? Let's Test Your Knowledge!
              </button>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && quiz && (
          <div className="tutor-quiz">
            <h2>Quiz: {quiz.topic}</h2>
            <p>Questions: {quiz.questionCount} • Time: {Math.round(quiz.timeLimit / 60)} minutes</p>

            {!quizResult ? (
              <form onSubmit={handleSubmitQuiz}>
                <div className="quiz-questions">
                  {quiz.questions.map((question, idx) => (
                    <div key={question.id} className="quiz-question">
                      <h4>Question {idx + 1}</h4>
                      <p className="question-text">{question.question}</p>
                      <div className="question-options">
                        {question.options.map((option, optIdx) => (
                          <label key={optIdx} className="option-label">
                            <input
                              type="radio"
                              name={question.id}
                              value={optIdx}
                              checked={quizAnswers[question.id] === optIdx}
                              onChange={() => handleQuizAnswerChange(question.id, optIdx)}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </form>
            ) : (
              <div className="quiz-result">
                <h3>Quiz Results</h3>
                <div className="result-stats">
                  <div className="result-stat">
                    <span className="result-label">Score:</span>
                    <span className="result-value">{quizResult.score}%</span>
                  </div>
                  <div className="result-stat">
                    <span className="result-label">Correct:</span>
                    <span className="result-value">{quizResult.correct}</span>
                  </div>
                  <div className="result-stat">
                    <span className="result-label">Wrong:</span>
                    <span className="result-value">{quizResult.wrong}</span>
                  </div>
                </div>

                {quizResult.weakTopics && quizResult.weakTopics.length > 0 && (
                  <div className="weak-topics">
                    <strong>Topics to review:</strong>
                    {quizResult.weakTopics.map((topic, i) => (
                      <span key={i} className="topic-tag">{topic}</span>
                    ))}
                  </div>
                )}

                <div className="detailed-feedback">
                  <h4>Detailed Feedback</h4>
                  {quizResult.detailedFeedback.map((feedback, idx) => (
                    <div key={idx} className={`feedback-item ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
                      <p className="feedback-question">{feedback.question}</p>
                      <p>Your answer: {feedback.yourAnswer}</p>
                      {!feedback.isCorrect && (
                        <>
                          <p className="correct-answer">Correct: {feedback.correctAnswer}</p>
                          <p className="explanation">{feedback.explanation}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <button onClick={() => { setQuiz(null); setQuizResult(null); }} className="btn-secondary">
                  Take Another Quiz
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'interview' && (
          <div className="tutor-interview">
            <h2>Interview Preparation</h2>

            {interviewQuestions.length === 0 ? (
              <form onSubmit={handleGenerateInterviewQuestions} className="tutor-form">
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={interviewForm.role}
                    onChange={(e) => setInterviewForm({ ...interviewForm, role: e.target.value })}
                  >
                    {INTERVIEW_ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Level</label>
                  <select
                    value={interviewForm.level}
                    onChange={(e) => setInterviewForm({ ...interviewForm, level: e.target.value })}
                  >
                    {DIFFICULTY_LEVELS.map(level => (
                      <option key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Number of Questions</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={interviewForm.questionCount}
                    onChange={(e) => setInterviewForm({ ...interviewForm, questionCount: Number(e.target.value) })}
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Generating...' : 'Generate Interview Questions'}
                </button>
              </form>
            ) : (
              <div className="interview-practice">
                <div className="interview-progress">
                  Question {currentQuestionIndex + 1} of {interviewQuestions.length}
                </div>

                {currentQuestion && (
                  <div className="interview-question-card">
                    <h3>{currentQuestion.question}</h3>
                    <p className="question-meta">
                      {currentQuestion.category} • {currentQuestion.level}
                    </p>

                    {currentQuestion.hints && currentQuestion.hints.length > 0 && (
                      <div className="hints">
                        <strong>Hints:</strong>
                        <ul>
                          {currentQuestion.hints.map((hint, i) => (
                            <li key={i}>{hint}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!interviewEvaluation ? (
                      <form onSubmit={handleSubmitInterviewResponse}>
                        <div className="form-group">
                          <label>Your Response</label>
                          <textarea
                            value={interviewResponse}
                            onChange={(e) => setInterviewResponse(e.target.value)}
                            placeholder="Type your answer using the STAR method (Situation, Task, Action, Result)..."
                            rows="8"
                            required
                          />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading}>
                          {loading ? 'Evaluating...' : 'Submit Response'}
                        </button>
                      </form>
                    ) : (
                      <div className="interview-evaluation">
                        <h4>Evaluation</h4>
                        <div className="evaluation-score">
                          Score: <strong>{interviewEvaluation.score}/100</strong>
                        </div>

                        {interviewEvaluation.strengths && interviewEvaluation.strengths.length > 0 && (
                          <div className="strengths">
                            <strong>✅ Strengths:</strong>
                            <ul>
                              {interviewEvaluation.strengths.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {interviewEvaluation.improvements && interviewEvaluation.improvements.length > 0 && (
                          <div className="improvements">
                            <strong>💡 Areas to Improve:</strong>
                            <ul>
                              {interviewEvaluation.improvements.map((imp, i) => (
                                <li key={i}>{imp}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {interviewEvaluation.sampleAnswer && (
                          <div className="sample-answer">
                            <strong>Sample Answer Approach:</strong>
                            <p>{interviewEvaluation.sampleAnswer}</p>
                          </div>
                        )}

                        <div className="evaluation-actions">
                          {currentQuestionIndex < interviewQuestions.length - 1 ? (
                            <button onClick={handleNextInterviewQuestion} className="btn-primary">
                              Next Question →
                            </button>
                          ) : (
                            <button onClick={() => setInterviewQuestions([])} className="btn-success">
                              Finish Interview Practice
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="tutor-analytics">
            <h2>Progress Analytics</h2>
            {loading ? (
              <p>Loading analytics...</p>
            ) : analyticsData ? (
              <>
                <div className="analytics-summary">
                  <div className="analytics-card">
                    <h4>Total Sessions</h4>
                    <p>{analyticsData.totalSessions}</p>
                  </div>
                  <div className="analytics-card">
                    <h4>Total Quizzes</h4>
                    <p>{analyticsData.totalQuizzes}</p>
                  </div>
                </div>

                {analyticsData.comprehensionTrend && analyticsData.comprehensionTrend.length > 0 && (
                  <div className="trend-section">
                    <h3>Comprehension Trend</h3>
                    <div className="trend-list">
                      {analyticsData.comprehensionTrend.slice(-10).map((item, idx) => (
                        <div key={idx} className="trend-item">
                          <span>{item.topic}</span>
                          <span className="score">{item.score}%</span>
                          <small>{new Date(item.date).toLocaleDateString()}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analyticsData.quizScoreTrend && analyticsData.quizScoreTrend.length > 0 && (
                  <div className="trend-section">
                    <h3>Quiz Score Trend</h3>
                    <div className="trend-list">
                      {analyticsData.quizScoreTrend.slice(-10).map((item, idx) => (
                        <div key={idx} className="trend-item">
                          <span>Quiz {idx + 1}</span>
                          <span className="score">{item.score}%</span>
                          <small>{new Date(item.date).toLocaleDateString()}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p>No analytics data available yet. Start learning to see your progress!</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PersonalTutor;
