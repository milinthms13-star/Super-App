import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CompatibilityQuestionnaire.css';

const CompatibilityQuestionnaire = ({ profileId, targetProfileId = null }) => {
  const [questionnaireStructure, setQuestionnaireStructure] = useState(null);
  const [answers, setAnswers] = useState({
    personality: [],
    lifestyle: [],
    family: [],
    career: [],
    finance: [],
    future: []
  });
  const [currentCategory, setCurrentCategory] = useState('personality');
  const [compatibility, setCompatibility] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const categories = [
    { id: 'personality', name: 'Personality & Values', icon: '🎭', questions: 10 },
    { id: 'lifestyle', name: 'Lifestyle & Habits', icon: '🌟', questions: 10 },
    { id: 'family', name: 'Family & Relationships', icon: '👨‍👩‍👧', questions: 10 },
    { id: 'career', name: 'Career & Ambitions', icon: '💼', questions: 8 },
    { id: 'finance', name: 'Finance & Living', icon: '💰', questions: 7 },
    { id: 'future', name: 'Future Plans', icon: '🎯', questions: 5 }
  ];

  useEffect(() => {
    fetchQuestions();
    fetchExistingAnswers();
  }, [profileId]);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get('/api/matrimonial/compatibility/questions');
      setQuestionnaireStructure(response.data.questionnaire);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    }
  };

  const fetchExistingAnswers = async () => {
    try {
      const response = await axios.get(`/api/matrimonial/compatibility/profile/${profileId}`);
      if (response.data.questionnaire) {
        const q = response.data.questionnaire;
        setAnswers({
          personality: q.personalityAnswers || [],
          lifestyle: q.lifestyleAnswers || [],
          family: q.familyAnswers || [],
          career: q.careerAnswers || [],
          finance: q.financeAnswers || [],
          future: q.futureAnswers || []
        });
        setCompletionPercentage(q.completionPercentage || 0);
      }
    } catch (err) {
      console.error('Failed to fetch existing answers:', err);
    }
  };

  const handleAnswer = (questionId, answer) => {
    const categoryAnswers = answers[currentCategory] || [];
    const existingIndex = categoryAnswers.findIndex(a => a.questionId === questionId);
    
    let updatedAnswers;
    if (existingIndex >= 0) {
      updatedAnswers = [...categoryAnswers];
      updatedAnswers[existingIndex] = { questionId, answer, answeredAt: new Date() };
    } else {
      updatedAnswers = [...categoryAnswers, { questionId, answer, answeredAt: new Date() }];
    }

    setAnswers({
      ...answers,
      [currentCategory]: updatedAnswers
    });
  };

  const saveAnswers = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `/api/matrimonial/compatibility/profile/${profileId}/answers`,
        {
          category: currentCategory,
          answers: answers[currentCategory]
        }
      );
      setCompletionPercentage(response.data.completionPercentage);
      alert('Answers saved successfully!');
    } catch (err) {
      console.error('Failed to save answers:', err);
      alert('Failed to save answers');
    } finally {
      setLoading(false);
    }
  };

  const calculateCompatibility = async () => {
    if (!targetProfileId) {
      alert('No target profile selected');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `/api/matrimonial/compatibility/profile/${profileId}/compatibility/${targetProfileId}`
      );
      setCompatibility(response.data.compatibility);
      setShowResults(true);
    } catch (err) {
      console.error('Failed to calculate compatibility:', err);
      alert(err.response?.data?.error || 'Failed to calculate compatibility');
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = (question, index) => {
    const categoryAnswers = answers[currentCategory] || [];
    const currentAnswer = categoryAnswers.find(a => a.questionId === question.id);

    switch (question.type) {
      case 'single':
        return (
          <div key={question.id} className="question-card">
            <div className="question-number">Question {index + 1}</div>
            <h3>{question.question}</h3>
            <div className="options-list">
              {question.options.map((option, i) => (
                <label key={i} className="option-item">
                  <input
                    type="radio"
                    name={question.id}
                    checked={currentAnswer?.answer === option}
                    onChange={() => handleAnswer(question.id, option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'multi':
        return (
          <div key={question.id} className="question-card">
            <div className="question-number">Question {index + 1}</div>
            <h3>{question.question}</h3>
            <p className="question-hint">Select all that apply</p>
            <div className="options-list">
              {question.options.map((option, i) => {
                const selectedOptions = currentAnswer?.answer || [];
                return (
                  <label key={i} className="option-item">
                    <input
                      type="checkbox"
                      checked={selectedOptions.includes(option)}
                      onChange={(e) => {
                        let newSelection = [...selectedOptions];
                        if (e.target.checked) {
                          newSelection.push(option);
                        } else {
                          newSelection = newSelection.filter(o => o !== option);
                        }
                        handleAnswer(question.id, newSelection);
                      }}
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 'scale':
        return (
          <div key={question.id} className="question-card">
            <div className="question-number">Question {index + 1}</div>
            <h3>{question.question}</h3>
            <div className="scale-container">
              <span className="scale-label">Not Important (1)</span>
              <input
                type="range"
                min={question.min}
                max={question.max}
                value={currentAnswer?.answer || 5}
                onChange={(e) => handleAnswer(question.id, parseInt(e.target.value))}
                className="scale-slider"
              />
              <span className="scale-label">Very Important ({question.max})</span>
            </div>
            <div className="scale-value">Current: {currentAnswer?.answer || 5}</div>
          </div>
        );

      case 'text':
        return (
          <div key={question.id} className="question-card">
            <div className="question-number">Question {index + 1}</div>
            <h3>{question.question}</h3>
            <textarea
              value={currentAnswer?.answer || ''}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
              placeholder="Share your thoughts..."
              rows="4"
              className="text-answer"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const getCategoryProgress = (categoryId) => {
    const categoryAnswers = answers[categoryId] || [];
    const category = categories.find(c => c.id === categoryId);
    return {
      answered: categoryAnswers.length,
      total: category?.questions || 0,
      percentage: category ? Math.round((categoryAnswers.length / category.questions) * 100) : 0
    };
  };

  if (!questionnaireStructure) {
    return <div className="loading-state">Loading questionnaire...</div>;
  }

  if (showResults && compatibility) {
    return (
      <div className="compatibility-results">
        <div className="results-header">
          <h2>Compatibility Results</h2>
          <button className="btn-secondary" onClick={() => setShowResults(false)}>
            ← Back to Questionnaire
          </button>
        </div>

        <div className="score-display">
          <div className="score-circle">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e0e0" strokeWidth="8" />
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke="#4caf50" 
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 45 * (compatibility.score / 100)}, ${2 * Math.PI * 45}`}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="score-text">
              <span className="score-number">{compatibility.score}</span>
              <span className="score-label">/ 100</span>
            </div>
          </div>
          <h3>Overall Compatibility</h3>
        </div>

        <div className="breakdown-grid">
          {Object.entries(compatibility.breakdown).map(([category, data]) => (
            <div key={category} className="breakdown-card">
              <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
              <div className="breakdown-bar">
                <div 
                  className="breakdown-fill" 
                  style={{ width: `${data.score}%` }}
                ></div>
              </div>
              <div className="breakdown-stats">
                <span>{data.score}/100</span>
                <span>Weight: {data.weight}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="analysis-section">
          <h3>Analysis</h3>
          {compatibility.analysis.strengths.length > 0 && (
            <div className="analysis-box strengths">
              <h4>✅ Strengths</h4>
              <ul>
                {compatibility.analysis.strengths.map((strength, i) => (
                  <li key={i}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {compatibility.analysis.concerns.length > 0 && (
            <div className="analysis-box concerns">
              <h4>⚠️ Areas to Discuss</h4>
              <ul>
                {compatibility.analysis.concerns.map((concern, i) => (
                  <li key={i}>{concern}</li>
                ))}
              </ul>
            </div>
          )}

          {compatibility.analysis.recommendations.length > 0 && (
            <div className="analysis-box recommendations">
              <h4>💡 Recommendations</h4>
              <ul>
                {compatibility.analysis.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="compatibility-questionnaire">
      <div className="questionnaire-header">
        <h2>Compatibility Questionnaire</h2>
        <div className="completion-bar">
          <div className="completion-fill" style={{ width: `${completionPercentage}%` }}></div>
        </div>
        <p>{completionPercentage}% Complete</p>
      </div>

      <div className="categories-nav">
        {categories.map(cat => {
          const progress = getCategoryProgress(cat.id);
          return (
            <button
              key={cat.id}
              className={`category-btn ${currentCategory === cat.id ? 'active' : ''}`}
              onClick={() => setCurrentCategory(cat.id)}
            >
              <span className="category-icon">{cat.icon}</span>
              <span className="category-name">{cat.name}</span>
              <span className="category-progress">{progress.answered}/{progress.total}</span>
            </button>
          );
        })}
      </div>

      <div className="questions-container">
        {questionnaireStructure[currentCategory]?.map((q, i) => renderQuestion(q, i))}
      </div>

      <div className="questionnaire-actions">
        <button 
          className="btn-secondary"
          onClick={() => {
            const currentIndex = categories.findIndex(c => c.id === currentCategory);
            if (currentIndex > 0) {
              setCurrentCategory(categories[currentIndex - 1].id);
            }
          }}
          disabled={currentCategory === 'personality'}
        >
          ← Previous Category
        </button>

        <button 
          className="btn-primary"
          onClick={saveAnswers}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Progress'}
        </button>

        {currentCategory === 'future' ? (
          <button 
            className="btn-success"
            onClick={() => {
              saveAnswers();
              if (targetProfileId) {
                calculateCompatibility();
              }
            }}
            disabled={loading}
          >
            Complete & {targetProfileId ? 'Calculate Compatibility' : 'Finish'}
          </button>
        ) : (
          <button 
            className="btn-secondary"
            onClick={() => {
              saveAnswers();
              const currentIndex = categories.findIndex(c => c.id === currentCategory);
              if (currentIndex < categories.length - 1) {
                setCurrentCategory(categories[currentIndex + 1].id);
              }
            }}
            disabled={loading}
          >
            Save & Next Category →
          </button>
        )}
      </div>

      {targetProfileId && completionPercentage === 100 && (
        <div className="calculate-box">
          <button 
            className="btn-calculate"
            onClick={calculateCompatibility}
            disabled={loading}
          >
            {loading ? 'Calculating...' : '🧮 Calculate Compatibility'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CompatibilityQuestionnaire;
