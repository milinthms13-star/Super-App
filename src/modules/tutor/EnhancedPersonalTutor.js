import React, { useState, useEffect } from 'react';
import * as tutorService from '../../services/tutorService';
import VoiceAndVideoControls from './VoiceAndVideoControls';
import './EnhancedPersonalTutor.css';

const SUBJECTS = [
  // Programming
  'JavaScript', 'Python', 'React', 'Node.js', 'Data Structures', 'Algorithms',
  
  // CA (Chartered Accountancy)
  'CA Foundation', 'CA Intermediate', 'CA Final',
  
  // Civil Services & School
  'Class 5-7', 'Class 8-10', 'Class 11-12',
  'UPSC Prelims', 'UPSC Mains', 'IAS Interview Prep',
  
  // Business & Management
  'Accounting', 'Marketing', 'Product Management', 'Finance', 'HR Management',
  
  // Languages
  'English', 'Hindi', 'Spanish', 'French', 'German',
  
  // Science
  'Physics', 'Chemistry', 'Biology', 'Mathematics',
];

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

const INTERVIEW_ROLES = [
  'Software Developer', 'Data Scientist', 'Product Manager',
  'Marketing Manager', 'UI/UX Designer', 'Accountant',
  'Business Analyst', 'HR Manager', 'Sales Executive',
];

const EnhancedPersonalTutor = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Dashboard state
  const [dashboardData, setDashboardData] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  // Session state
  const [sessionForm, setSessionForm] = useState({
    subject: 'JavaScript',
    topic: '',
    difficulty: 'beginner',
    learningGoal: '',
  });
  const [currentSession, setCurrentSession] = useState(null);
  const [lessonProgress, setLessonProgress] = useState({});

  // Study Plan state
  const [studyPlans, setStudyPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [studyPlanForm, setStudyPlanForm] = useState({
    subject: 'JavaScript',
    goal: '',
    targetDate: '',
    hoursPerWeek: 5,
  });

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

  // Flashcard state
  const [flashcards, setFlashcards] = useState([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

  // Study Group state
  const [studyGroups, setStudyGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    subject: 'JavaScript',
    description: '',
  });

  useEffect(() => {
    fetchDashboard();
    fetchAchievements();
    fetchStudyPlans();
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

  const fetchAchievements = async () => {
    try {
      const data = await tutorService.fetchAchievements();
      setAchievements(data.achievements || []);
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const fetchStudyPlans = async () => {
    try {
      const data = await tutorService.fetchStudyPlans();
      setStudyPlans(data.plans || []);
    } catch (error) {
      console.error('Error fetching study plans:', error);
    }
  };

  const handleCreateStudyPlan = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await tutorService.createStudyPlan(studyPlanForm);
      setMessage('Study plan created successfully!');
      setSelectedPlan(data.plan);
      await fetchStudyPlans();
      setActiveTab('studyPlan');
    } catch (error) {
      console.error('Error creating study plan:', error);
      setMessage('Failed to create study plan');
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
    const timeSpent = 15;

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
      await checkForAchievements();
    } catch (error) {
      console.error('Error recording progress:', error);
      setMessage('Failed to record progress');
    } finally {
      setLoading(false);
    }
  };

  const checkForAchievements = async () => {
    try {
      const data = await tutorService.checkAchievements();
      if (data.newAchievements && data.newAchievements.length > 0) {
        showAchievementNotification(data.newAchievements[0]);
        await fetchAchievements();
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  const showAchievementNotification = (achievement) => {
    setMessage(`🎉 Achievement Unlocked: ${achievement.name}! ${achievement.description}`);
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
      await checkForAchievements();
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setMessage('Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!currentSession) {
      setMessage('Please start a learning session first');
      return;
    }

    setLoading(true);
    try {
      const data = await tutorService.generateFlashcards({
        sessionId: currentSession.sessionId,
        count: 10,
      });
      setFlashcards(data.flashcards || []);
      setCurrentFlashcardIndex(0);
      setShowFlashcardAnswer(false);
      setActiveTab('flashcards');
      setMessage('Flashcards created! Start reviewing.');
    } catch (error) {
      console.error('Error generating flashcards:', error);
      setMessage('Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  };

  const handleFlashcardConfidence = async (confidence) => {
    if (!flashcards[currentFlashcardIndex]) return;

    try {
      await tutorService.recordFlashcardReview({
        flashcardId: flashcards[currentFlashcardIndex].id,
        confidence,
      });

      if (currentFlashcardIndex < flashcards.length - 1) {
        setCurrentFlashcardIndex(prev => prev + 1);
        setShowFlashcardAnswer(false);
      } else {
        setMessage('Flashcard review complete! Great job!');
      }
    } catch (error) {
      console.error('Error recording flashcard review:', error);
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
      await checkForAchievements();
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
      await checkForAchievements();
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

  const handleCreateStudyGroup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await tutorService.createStudyGroup(groupForm);
      setMessage('Study group created successfully!');
      await fetchStudyGroups();
      setGroupForm({ name: '', subject: 'JavaScript', description: '' });
    } catch (error) {
      console.error('Error creating study group:', error);
      setMessage('Failed to create study group');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudyGroups = async () => {
    try {
      const data = await tutorService.fetchStudyGroups();
      setStudyGroups(data.groups || []);
    } catch (error) {
      console.error('Error fetching study groups:', error);
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      await tutorService.joinStudyGroup(groupId);
      setMessage('Joined study group successfully!');
      await fetchStudyGroups();
    } catch (error) {
      console.error('Error joining group:', error);
      setMessage('Failed to join group');
    }
  };

  const currentQuestion = interviewQuestions[currentQuestionIndex];
  const currentFlashcard = flashcards[currentFlashcardIndex];

  return (
    <div className="enhanced-tutor-container">
      <header className="enhanced-tutor-header">
        <div>
          <h1>🎓 Enhanced Personal Tutor</h1>
          <p>AI-Powered Adaptive Learning • Gamification • Collaborative Study • Progress Analytics</p>
        </div>
        {dashboardData?.stats && (
          <div className="header-stats">
            <div className="header-stat">
              <span className="stat-icon">🔥</span>
              <span className="stat-value">{dashboardData.stats.streak || 0}</span>
              <span className="stat-label">Day Streak</span>
            </div>
            <div className="header-stat">
              <span className="stat-icon">⭐</span>
              <span className="stat-value">{dashboardData.stats.points || 0}</span>
              <span className="stat-label">Points</span>
            </div>
            <div className="header-stat">
              <span className="stat-icon">🏆</span>
              <span className="stat-value">{achievements.filter(a => a.unlocked).length}</span>
              <span className="stat-label">Achievements</span>
            </div>
          </div>
        )}
      </header>

      {message && (
        <div className={`tutor-message ${message.includes('Failed') || message.includes('Failed') ? 'error' : 'success'}`}>
          {message}
          <button onClick={() => setMessage('')}>✕</button>
        </div>
      )}

      <nav className="enhanced-tutor-tabs">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
          📊 Dashboard
        </button>
        <button className={activeTab === 'studyPlanSetup' ? 'active' : ''} onClick={() => setActiveTab('studyPlanSetup')}>
          📅 Create Study Plan
        </button>
        <button className={activeTab === 'studyPlan' ? 'active' : ''} onClick={() => setActiveTab('studyPlan')} disabled={!selectedPlan && studyPlans.length === 0}>
          📖 My Study Plan
        </button>
        <button className={activeTab === 'learn' ? 'active' : ''} onClick={() => setActiveTab('learn')}>
          📚 Start Learning
        </button>
        <button className={activeTab === 'lesson' ? 'active' : ''} onClick={() => setActiveTab('lesson')} disabled={!currentSession}>
          📝 Lesson
        </button>
        <button className={activeTab === 'quiz' ? 'active' : ''} onClick={() => setActiveTab('quiz')} disabled={!quiz}>
          ✅ Quiz
        </button>
        <button className={activeTab === 'flashcards' ? 'active' : ''} onClick={() => setActiveTab('flashcards')} disabled={flashcards.length === 0}>
          🗂️ Flashcards
        </button>
        <button className={activeTab === 'interview' ? 'active' : ''} onClick={() => setActiveTab('interview')}>
          💼 Interview Prep
        </button>
        <button className={activeTab === 'analytics' ? 'active' : ''} onClick={handleFetchAnalytics}>
          📈 Analytics
        </button>
        <button className={activeTab === 'achievements' ? 'active' : ''} onClick={() => { setActiveTab('achievements'); fetchAchievements(); }}>
          🏆 Achievements
        </button>
        <button className={activeTab === 'studyGroups' ? 'active' : ''} onClick={() => { setActiveTab('studyGroups'); fetchStudyGroups(); }}>
          👥 Study Groups
        </button>
      </nav>

      <main className="enhanced-tutor-content">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="tutor-dashboard">
            <h2>Your Learning Dashboard</h2>
            {loading ? (
              <div className="loading-spinner">Loading dashboard...</div>
            ) : dashboardData ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card pulse">
                    <div className="stat-icon">📚</div>
                    <h3>Total Sessions</h3>
                    <p className="stat-value">{dashboardData.stats?.totalSessions || 0}</p>
                  </div>
                  <div className="stat-card pulse">
                    <div className="stat-icon">⏱️</div>
                    <h3>Time Spent</h3>
                    <p className="stat-value">{Math.round((dashboardData.stats?.totalTimeSpent || 0) / 60)}h</p>
                  </div>
                  <div className="stat-card pulse">
                    <div className="stat-icon">📝</div>
                    <h3>Avg Quiz Score</h3>
                    <p className="stat-value">{dashboardData.stats?.avgQuizScore || 0}%</p>
                  </div>
                  <div className="stat-card pulse">
                    <div className="stat-icon">💼</div>
                    <h3>Interview Score</h3>
                    <p className="stat-value">{dashboardData.stats?.avgInterviewScore || 0}%</p>
                  </div>
                </div>

                {dashboardData.topWeakAreas && dashboardData.topWeakAreas.length > 0 && (
                  <div className="weak-areas-section">
                    <h3>🎯 Areas to Strengthen</h3>
                    <div className="weak-areas-list">
                      {dashboardData.topWeakAreas.map((area, idx) => (
                        <span key={idx} className="weak-area-tag">{area}</span>
                      ))}
                    </div>
                  </div>
                )}

                {dashboardData.recommendedTopics && dashboardData.recommendedTopics.length > 0 && (
                  <div className="recommended-section">
                    <h3>💡 Recommended for You</h3>
                    <div className="recommended-list">
                      {dashboardData.recommendedTopics.map((topic, idx) => (
                        <div key={idx} className="recommended-card" onClick={() => {
                          setSessionForm({...sessionForm, subject: topic.subject, topic: topic.name});
                          setActiveTab('learn');
                        }}>
                          <h4>{topic.name}</h4>
                          <p>{topic.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dashboardData.recentSessions && dashboardData.recentSessions.length > 0 && (
                  <div className="recent-section">
                    <h3>📖 Recent Sessions</h3>
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
              <div className="empty-state">
                <p>Start your first learning session to see your progress!</p>
                <button onClick={() => setActiveTab('learn')} className="btn-primary">
                  Start Learning Now →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Study Plan Setup Tab */}
        {activeTab === 'studyPlanSetup' && (
          <div className="study-plan-setup">
            <h2>Create AI-Powered Study Plan</h2>
            <form onSubmit={handleCreateStudyPlan} className="tutor-form">
              <div className="form-group">
                <label>Subject</label>
                <select value={studyPlanForm.subject} onChange={(e) => setStudyPlanForm({...studyPlanForm, subject: e.target.value})} required>
                  {SUBJECTS.map(subject => (<option key={subject} value={subject}>{subject}</option>))}
                </select>
              </div>
              <div className="form-group">
                <label>Learning Goal</label>
                <textarea value={studyPlanForm.goal} onChange={(e) => setStudyPlanForm({...studyPlanForm, goal: e.target.value})} placeholder="e.g., Master React hooks and build a full-stack application" rows="3" required />
              </div>
              <div className="form-group">
                <label>Target Date</label>
                <input type="date" value={studyPlanForm.targetDate} onChange={(e) => setStudyPlanForm({...studyPlanForm, targetDate: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Hours Per Week</label>
                <input type="number" min="1" max="40" value={studyPlanForm.hoursPerWeek} onChange={(e) => setStudyPlanForm({...studyPlanForm, hoursPerWeek: Number(e.target.value)})} required />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : '🚀 Generate AI Study Plan'}</button>
            </form>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="achievements-tab">
            <h2>🏆 Your Achievements</h2>
            <div className="achievements-grid">
              {achievements.map((achievement, idx) => (
                <div key={idx} className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">{achievement.icon || '🏅'}</div>
                  <h4>{achievement.name}</h4>
                  <p>{achievement.description}</p>
                  {achievement.unlocked && <span className="unlock-date">Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}</span>}
                  {!achievement.unlocked && achievement.progress && (
                    <div className="achievement-progress">
                      <div className="progress-bar"><div className="progress-fill" style={{width: `${achievement.progress}%`}}></div></div>
                      <span>{achievement.progress}% Complete</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {leaderboard.length > 0 && (
              <div className="leaderboard-section">
                <h3>📊 Global Leaderboard</h3>
                <div className="leaderboard">
                  {leaderboard.map((user, idx) => (
                    <div key={idx} className="leaderboard-item">
                      <span className="rank">#{idx + 1}</span>
                      <span className="username">{user.username}</span>
                      <span className="points">{user.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Study Groups Tab */}
        {activeTab === 'studyGroups' && (
          <div className="study-groups-tab">
            <h2>👥 Study Groups</h2>
            <div className="create-group-section">
              <h3>Create New Group</h3>
              <form onSubmit={handleCreateStudyGroup} className="group-form">
                <input type="text" placeholder="Group Name" value={groupForm.name} onChange={(e) => setGroupForm({...groupForm, name: e.target.value})} required />
                <select value={groupForm.subject} onChange={(e) => setGroupForm({...groupForm, subject: e.target.value})}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <textarea placeholder="Description" value={groupForm.description} onChange={(e) => setGroupForm({...groupForm, description: e.target.value})} rows="2" />
                <button type="submit" className="btn-primary" disabled={loading}>Create Group</button>
              </form>
            </div>
            <div className="groups-list">
              <h3>Available Groups</h3>
              {studyGroups.map(group => (
                <div key={group._id} className="group-card">
                  <h4>{group.name}</h4>
                  <p>{group.description}</p>
                  <span className="group-meta">{group.subject} • {group.members?.length || 0} members</span>
                  <button onClick={() => handleJoinGroup(group._id)} className="btn-secondary">Join Group</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Include existing tabs from original component */}
        {activeTab === 'learn' && (
          <div className="tutor-start">
            <h2>Start a New Learning Session</h2>
            <form onSubmit={handleStartSession} className="tutor-form">
              <div className="form-group">
                <label>Subject</label>
                <select value={sessionForm.subject} onChange={(e) => setSessionForm({...sessionForm, subject: e.target.value})} required>
                  {SUBJECTS.map(subject => (<option key={subject} value={subject}>{subject}</option>))}
                </select>
              </div>
              <div className="form-group">
                <label>Topic</label>
                <input type="text" value={sessionForm.topic} onChange={(e) => setSessionForm({...sessionForm, topic: e.target.value})} placeholder="e.g., Async Programming, Closures, etc." required />
              </div>
              <div className="form-group">
                <label>Difficulty Level</label>
                <select value={sessionForm.difficulty} onChange={(e) => setSessionForm({...sessionForm, difficulty: e.target.value})}>
                  {DIFFICULTY_LEVELS.map(level => (<option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>))}
                </select>
              </div>
              <div className="form-group">
                <label>Learning Goal (Optional)</label>
                <textarea value={sessionForm.learningGoal} onChange={(e) => setSessionForm({...sessionForm, learningGoal: e.target.value})} placeholder="What do you want to achieve in this session?" rows="3" />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Starting...' : '🚀 Start Learning Session'}</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default EnhancedPersonalTutor;
