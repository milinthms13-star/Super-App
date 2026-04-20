import React, { useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import "../../../styles/Polls.css";

const PollCard = ({ poll, onVote, hasVoted }) => {
  const { currentUser } = useApp();
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResults, setShowResults] = useState(hasVoted);

  const totalVotes = poll.options.reduce((sum, option) => sum + (option.votes || 0), 0);
  const isExpired = new Date(poll.expiresAt) < new Date();

  const handleVote = async (optionIndex) => {
    if (hasVoted || isExpired) return;

    setSelectedOption(optionIndex);
    setShowResults(true);

    // In a real app, this would call an API
    onVote(poll._id, optionIndex);
  };

  const getPercentage = (votes) => {
    return totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  };

  return (
    <div className="poll-card">
      <div className="poll-header">
        <div className="poll-author">
          <img
            src={poll.author?.avatar || '👤'}
            alt={poll.author?.name || 'Anonymous'}
            className="author-avatar"
          />
          <div className="author-info">
            <h4>{poll.author?.name || 'Anonymous'}</h4>
            <span className="poll-time">
              {new Date(poll.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        {isExpired && (
          <span className="expired-badge">Expired</span>
        )}
      </div>

      <div className="poll-content">
        <h3 className="poll-question">{poll.question}</h3>

        <div className="poll-options">
          {poll.options.map((option, index) => {
            const percentage = getPercentage(option.votes || 0);
            const isSelected = selectedOption === index;

            return (
              <div
                key={index}
                className={`poll-option ${showResults ? 'show-results' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleVote(index)}
              >
                <div className="option-content">
                  <span className="option-text">{option.text}</span>
                  {showResults && (
                    <span className="vote-count">
                      {option.votes || 0} votes ({percentage}%)
                    </span>
                  )}
                </div>

                {showResults && (
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                )}

                {!showResults && !isExpired && (
                  <div className="vote-indicator">
                    <div className="radio-button"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="poll-footer">
          <span className="total-votes">{totalVotes} total votes</span>
          {!isExpired && (
            <span className="expires-in">
              Expires {new Date(poll.expiresAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const CreatePoll = ({ onPollCreated }) => {
  const { currentUser } = useApp();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [expiresIn, setExpiresIn] = useState(24); // hours
  const [loading, setLoading] = useState(false);

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    if (!question.trim() || options.filter(opt => opt.trim()).length < 2) {
      alert('Please provide a question and at least 2 options');
      return;
    }

    setLoading(true);

    const poll = {
      _id: `poll-${Date.now()}`,
      author: {
        _id: currentUser?._id,
        name: currentUser?.name || 'You',
        avatar: currentUser?.avatar || '👤'
      },
      question: question.trim(),
      options: options.filter(opt => opt.trim()).map(text => ({
        text: text.trim(),
        votes: 0
      })),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString(),
      totalVotes: 0
    };

    onPollCreated(poll);
    setQuestion('');
    setOptions(['', '']);
    setExpiresIn(24);
    setLoading(false);
  };

  return (
    <div className="create-poll">
      <div className="create-poll-header">
        <h3>📊 Create a Poll</h3>
      </div>

      <div className="create-poll-content">
        <div className="form-group">
          <label>Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What's your question?"
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label>Options</label>
          {options.map((option, index) => (
            <div key={index} className="option-input">
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                maxLength={100}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  className="remove-option"
                  onClick={() => removeOption(index)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {options.length < 6 && (
            <button type="button" className="add-option" onClick={addOption}>
              + Add Option
            </button>
          )}
        </div>

        <div className="form-group">
          <label>Expires in</label>
          <select value={expiresIn} onChange={(e) => setExpiresIn(Number(e.target.value))}>
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={12}>12 hours</option>
            <option value={24}>1 day</option>
            <option value={168}>1 week</option>
          </select>
        </div>

        <button
          className="create-poll-btn"
          onClick={handleSubmit}
          disabled={loading || !question.trim() || options.filter(opt => opt.trim()).length < 2}
        >
          {loading ? 'Creating...' : 'Create Poll'}
        </button>
      </div>
    </div>
  );
};

const Polls = () => {
  const [polls, setPolls] = useState([
    {
      _id: 'poll-1',
      author: { name: 'John Doe', avatar: '👨' },
      question: 'What\'s your favorite programming language?',
      options: [
        { text: 'JavaScript', votes: 45 },
        { text: 'Python', votes: 32 },
        { text: 'Java', votes: 28 },
        { text: 'C++', votes: 15 }
      ],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
      totalVotes: 120
    },
    {
      _id: 'poll-2',
      author: { name: 'Jane Smith', avatar: '👩' },
      question: 'Which social media feature would you like most?',
      options: [
        { text: 'Stories', votes: 67 },
        { text: 'Live streaming', votes: 89 },
        { text: 'Polls', votes: 34 },
        { text: 'Group chats', votes: 56 }
      ],
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
      totalVotes: 246
    }
  ]);
  const [userVotes, setUserVotes] = useState(new Set());

  const handleVote = (pollId, optionIndex) => {
    setPolls(currentPolls =>
      currentPolls.map(poll => {
        if (poll._id === pollId) {
          const newOptions = [...poll.options];
          newOptions[optionIndex].votes = (newOptions[optionIndex].votes || 0) + 1;
          return {
            ...poll,
            options: newOptions,
            totalVotes: poll.totalVotes + 1
          };
        }
        return poll;
      })
    );
    setUserVotes(prev => new Set([...prev, pollId]));
  };

  const handlePollCreated = (newPoll) => {
    setPolls(current => [newPoll, ...current]);
  };

  return (
    <div className="polls-container">
      <div className="polls-header">
        <h2>📊 Polls</h2>
        <p>Vote on questions and see what others think</p>
      </div>

      <CreatePoll onPollCreated={handlePollCreated} />

      <div className="polls-list">
        {polls.length === 0 ? (
          <div className="empty-state">
            <p>No polls yet. Create the first one!</p>
          </div>
        ) : (
          polls.map(poll => (
            <PollCard
              key={poll._id}
              poll={poll}
              onVote={handleVote}
              hasVoted={userVotes.has(poll._id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Polls;