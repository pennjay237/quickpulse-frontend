import React, { useState } from 'react';
import './PollCreator.css';

const PollCreator = ({ sessionId, onPollCreated }) => {
  const [question, setQuestion] = useState('');
  const [type, setType] = useState('single-choice');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate question
    if (!question.trim()) {
      setError('Please enter a question');
      setLoading(false);
      return;
    }

    // Validate options for multiple/single choice
    if (type !== 'open-ended') {
      const validOptions = options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        setError('Please add at least 2 options');
        setLoading(false);
        return;
      }
    }

    const pollData = {
      sessionId,
      question: question.trim(),
      type,
      options: type !== 'open-ended' ? options.filter(opt => opt.trim()) : []
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(pollData)
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Poll created successfully!');
        setQuestion('');
        setType('single-choice');
        setOptions(['', '']);
        onPollCreated(data);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to create poll');
      }
    } catch (err) {
      setError('Failed to create poll. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="poll-creator">
      <div className="poll-creator-header">
        <h3>📊 Create New Poll</h3>
        <p>Create polls for your participants to answer in real-time</p>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Poll Question *</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What is your favorite feature?"
            required
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label>Poll Type *</label>
          <select value={type} onChange={(e) => setType(e.target.value)} disabled={loading}>
            <option value="single-choice">🔘 Single Choice (Radio Buttons)</option>
            <option value="multiple-choice">✅ Multiple Choice (Checkboxes)</option>
            <option value="open-ended">✏️ Open Ended (Text Answer)</option>
          </select>
        </div>
        
        {type !== 'open-ended' && (
          <div className="options-section">
            <label>Answer Options *</label>
            <div className="options-help">
              Add at least 2 options for participants to choose from
            </div>
            {options.map((option, index) => (
              <div key={index} className="option-input">
                <span className="option-number">{index + 1}.</span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  disabled={loading}
                />
                {options.length > 2 && (
                  <button 
                    type="button" 
                    onClick={() => removeOption(index)} 
                    className="remove-option"
                    disabled={loading}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <button 
                type="button" 
                onClick={addOption} 
                className="add-option"
                disabled={loading}
              >
                + Add Another Option
              </button>
            )}
          </div>
        )}
        
        {type === 'open-ended' && (
          <div className="info-box">
            <span>💡</span>
            <p>Open-ended polls allow participants to write their own answers. Great for feedback and suggestions!</p>
          </div>
        )}
        
        <div className="form-actions">
          <button type="submit" disabled={loading} className="create-poll-btn">
            {loading ? 'Creating Poll...' : 'Create Poll (Draft)'}
          </button>
        </div>
      </form>
      
      <div className="poll-tips">
        <h4>💡 Tips:</h4>
        <ul>
          <li>Polls are saved as drafts first</li>
          <li>You can publish them later when ready</li>
          <li>Participants will see published polls instantly</li>
          <li>Close polls to stop accepting answers</li>
        </ul>
      </div>
    </div>
  );
};

export default PollCreator;
