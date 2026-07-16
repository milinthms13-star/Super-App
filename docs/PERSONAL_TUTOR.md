# 🎓 Personal Tutor Agent

## Overview

The Personal Tutor Agent is an intelligent, adaptive learning system that **teaches instead of just answering questions**. It provides personalized lessons, generates quizzes, tracks progress, and prepares users for interviews - all using **free APIs and rule-based AI**.

## ✨ Key Features

### 1. **Adaptive Lessons** 📚
- Generates personalized lesson content based on difficulty level
- Adapts to user's learning style (fast-paced, detailed, balanced)
- Identifies and reinforces weak areas
- Provides structured learning paths

### 2. **Quiz Generation** ✅
- Creates quizzes tailored to topic and difficulty
- Provides detailed feedback on each answer
- Identifies weak topics for targeted improvement
- Tracks performance trends over time

### 3. **Progress Tracking** 📈
- Records time spent on each lesson section
- Monitors comprehension scores
- Provides analytics on learning trends
- Recommends next topics based on performance

### 4. **Interview Preparation** 💼
- Generates role-specific interview questions
- Evaluates responses using STAR method analysis
- Provides actionable feedback and sample answers
- Covers behavioral, technical, and situational questions

## 🏗️ Architecture

### Backend Components

```
backend/
├── routes/
│   └── personalTutor.js          # API endpoints
├── services/
│   └── tutorAIService.js         # AI logic (rule-based, no API keys)
├── models/
│   ├── TutorSession.js           # Learning sessions
│   ├── LearningProgress.js       # Progress records
│   ├── QuizResult.js             # Quiz submissions
│   └── InterviewPractice.js      # Interview practice data
├── data/
│   ├── questionBanks.js          # Quiz questions by subject
│   └── interviewQuestions.js    # Interview questions by role
├── validations/
│   └── tutorValidations.js       # Input validation
└── tests/
    └── personalTutor.routes.test.js
```

### Frontend Components

```
src/
├── modules/tutor/
│   ├── PersonalTutor.js         # Main component
│   └── PersonalTutor.css        # Styling
└── services/
    └── tutorService.js          # API integration
```

## 🚀 API Endpoints

### Session Management

**Start New Session**
```http
POST /api/tutor/sessions/start
Content-Type: application/json
Authorization: Bearer {token}

{
  "subject": "JavaScript",
  "topic": "Closures",
  "difficulty": "intermediate",
  "learningGoal": "Master closures and lexical scope"
}
```

**Get Session Details**
```http
GET /api/tutor/sessions/:sessionId
Authorization: Bearer {token}
```

**Complete Session**
```http
POST /api/tutor/sessions/:sessionId/complete
Authorization: Bearer {token}
```

### Learning Progress

**Record Progress**
```http
POST /api/tutor/lessons/progress
Content-Type: application/json
Authorization: Bearer {token}

{
  "sessionId": "session-123",
  "lessonSection": "Introduction to Closures",
  "timeSpent": 300,
  "comprehensionScore": 85,
  "notes": "Great lesson!"
}
```

### Quiz System

**Generate Quiz**
```http
POST /api/tutor/quiz/generate
Content-Type: application/json
Authorization: Bearer {token}

{
  "sessionId": "session-123",
  "questionCount": 10,
  "difficulty": "intermediate"
}
```

**Submit Quiz**
```http
POST /api/tutor/quiz/submit
Content-Type: application/json
Authorization: Bearer {token}

{
  "sessionId": "session-123",
  "quizId": "quiz-456",
  "answers": [
    {
      "questionId": "q1",
      "selectedAnswer": 2,
      "question": { "id": "q1", "correctAnswer": 2, "points": 5 }
    }
  ]
}
```

### Interview Preparation

**Generate Interview Questions**
```http
POST /api/tutor/interview/generate
Content-Type: application/json
Authorization: Bearer {token}

{
  "role": "Software Developer",
  "level": "intermediate",
  "focusAreas": "JavaScript, React",
  "questionCount": 5
}
```

**Submit Interview Response**
```http
POST /api/tutor/interview/practice
Content-Type: application/json
Authorization: Bearer {token}

{
  "role": "Software Developer",
  "question": "Tell me about a challenging project",
  "response": "In my last project...",
  "timeSpent": 300
}
```

### Dashboard & Analytics

**Get Dashboard**
```http
GET /api/tutor/dashboard
Authorization: Bearer {token}
```

**Get Analytics**
```http
GET /api/tutor/progress/analytics?days=30&subject=JavaScript
Authorization: Bearer {token}
```

## 📊 Data Models

### TutorSession
```javascript
{
  sessionId: String,
  userEmail: String,
  subject: String,
  topic: String,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  learningGoal: String,
  lessonContent: Object,
  weakAreas: [String],
  progressRecords: [String],
  totalTimeSpent: Number,
  status: 'in_progress' | 'completed' | 'paused',
  startedAt: Date,
  completedAt: Date
}
```

### LearningProgress
```javascript
{
  progressId: String,
  userEmail: String,
  sessionId: String,
  subject: String,
  topic: String,
  lessonSection: String,
  timeSpent: Number,
  comprehensionScore: Number (0-100),
  notes: String,
  recordedAt: Date
}
```

### QuizResult
```javascript
{
  resultId: String,
  userEmail: String,
  sessionId: String,
  quizId: String,
  answers: [Object],
  score: Number (0-100),
  correct: Number,
  wrong: Number,
  weakTopics: [String],
  detailedFeedback: [Object],
  completedAt: Date
}
```

### InterviewPractice
```javascript
{
  practiceId: String,
  userEmail: String,
  role: String,
  question: String,
  response: String,
  evaluation: {
    score: Number (0-100),
    strengths: [String],
    improvements: [String],
    sampleAnswer: String
  },
  timeSpent: Number,
  completedAt: Date
}
```

## 🎯 Supported Subjects

- **JavaScript** (Variables, Functions, Async Programming, etc.)
- **Python** (Basics, Data Structures, OOP, etc.)
- **React** (Components, Hooks, State Management)
- **Data Structures** (Arrays, Linked Lists, Trees, Graphs)
- **Accounting** (Basics, GST, Financial Statements)
- **Product Management**
- **Marketing**

## 💼 Supported Interview Roles

- Software Developer
- Data Scientist
- Product Manager
- Marketing Manager
- UI/UX Designer
- Accountant

## 🧠 AI Logic (No API Keys Required)

The tutor uses **rule-based AI** and **intelligent algorithms** without requiring paid API keys:

### Adaptive Lesson Generation
- Analyzes learning style from previous progress
- Adjusts content complexity based on difficulty level
- Generates structured lessons with sections, examples, and exercises

### Quiz Generation
- Pulls from extensive question banks organized by subject/topic/difficulty
- Randomizes questions to prevent memorization
- Provides detailed explanations for each answer

### Interview Evaluation
- Analyzes response length and structure
- Checks for STAR method (Situation, Task, Action, Result)
- Identifies role-specific keywords
- Provides scored feedback with actionable improvements

### Progress Analysis
- Tracks comprehension scores across topics
- Identifies weak areas (topics with <70% average score)
- Recommends next topics based on performance:
  - **80%+**: Advance to next topic
  - **60-79%**: Practice current topic
  - **<60%**: Review fundamentals

## 🔧 Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Routes to App

In `backend/app.js`:
```javascript
const personalTutorRoutes = require('./routes/personalTutor');
app.use('/api/tutor', personalTutorRoutes);
```

### 3. Add Component to Router

In your main routing file:
```javascript
import PersonalTutor from './modules/tutor/PersonalTutor';

// In your routes:
<Route path="/tutor" element={<PersonalTutor />} />
```

### 4. Run Tests

```bash
npm test -- personalTutor.routes.test.js
```

## 📈 Usage Example

### Starting a Learning Session

```javascript
// Frontend code
import * as tutorService from '../../services/tutorService';

const startLearning = async () => {
  const session = await tutorService.startSession({
    subject: 'JavaScript',
    topic: 'Promises',
    difficulty: 'intermediate',
    learningGoal: 'Understand async/await and error handling'
  });
  
  console.log(session.lessonContent);
  // Navigate to lesson view
};
```

### Taking a Quiz

```javascript
// Generate quiz
const quiz = await tutorService.generateQuiz({
  sessionId: currentSession.sessionId,
  questionCount: 10,
  difficulty: 'intermediate'
});

// Submit answers
const result = await tutorService.submitQuiz({
  sessionId: currentSession.sessionId,
  quizId: quiz.quizId,
  answers: userAnswers
});

console.log(`Score: ${result.score}%`);
console.log(`Weak areas: ${result.weakTopics.join(', ')}`);
```

### Interview Practice

```javascript
// Generate questions
const questions = await tutorService.generateInterviewQuestions({
  role: 'Software Developer',
  level: 'intermediate',
  questionCount: 5
});

// Submit response
const evaluation = await tutorService.submitInterviewPractice({
  role: 'Software Developer',
  question: questions[0].question,
  response: userResponse
});

console.log(`Score: ${evaluation.score}/100`);
console.log('Strengths:', evaluation.strengths);
console.log('Improvements:', evaluation.improvements);
```

## 🎨 UI Features

### Dashboard
- Total sessions completed
- Time spent learning
- Average quiz and interview scores
- Weak areas identification
- Recent activity

### Learning Session
- Structured lesson sections
- Progress sliders for each section
- Examples and practice exercises
- Quick quiz generation

### Quiz Interface
- Clear question presentation
- Multiple choice options
- Detailed feedback with explanations
- Performance analytics

### Interview Practice
- Role-specific questions
- Hints and key points
- Real-time evaluation
- Actionable feedback

### Analytics
- Comprehension trend over time
- Quiz score progression
- Time spent per subject
- Topic performance breakdown

## 🚀 Future Enhancements

### Phase 1 (Current)
- ✅ Rule-based AI (no API keys)
- ✅ Basic question banks
- ✅ Progress tracking
- ✅ Interview evaluation

### Phase 2 (Planned)
- [ ] Integration with free Hugging Face models
- [ ] Expanded question banks (1000+ questions)
- [ ] Peer comparison and leaderboards
- [ ] Study streak tracking
- [ ] Spaced repetition system

### Phase 3 (Advanced)
- [ ] Voice-based interview practice
- [ ] Video lesson integration
- [ ] Collaborative learning features
- [ ] Certificate generation
- [ ] Mobile app version

## 🤝 Integration with Existing Modules

### SkillLearning Module
- Share progress data
- Link certificates to tutor sessions
- Unified learning dashboard

### Job Portal
- Interview prep aligned with job applications
- Skill assessments for job matching
- Resume skill recommendations

### Education Module
- Course completion tracking
- Certification preparation
- Career path alignment

## 📝 Best Practices

### For Learners
1. Start with beginner difficulty and progress gradually
2. Complete quizzes after each lesson to reinforce learning
3. Practice interview questions regularly
4. Review weak areas before moving to new topics
5. Set realistic learning goals

### For Administrators
1. Regularly update question banks
2. Monitor user progress patterns
3. Add new subjects based on demand
4. Gather feedback for content improvement
5. Track completion rates

## 🛠️ Troubleshooting

**Issue: Sessions not saving**
- Check MongoDB connection
- Verify authentication token
- Ensure required fields are provided

**Issue: Quiz generation fails**
- Verify subject/topic exists in question bank
- Check difficulty level is valid
- Ensure session ID is correct

**Issue: Low interview scores**
- Encourage STAR method usage
- Suggest longer, more detailed responses
- Provide role-specific keyword examples

## 📞 Support

For issues or questions:
1. Check the documentation above
2. Review test files for usage examples
3. Examine backend logs for errors
4. Contact development team

## 📄 License

This module is part of the Super-App project and follows the same license terms.

---

**Built with ❤️ using free tools and open-source technologies**
