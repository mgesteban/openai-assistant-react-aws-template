import React, { useState, useEffect } from 'react';
import { Send, Edit2, Download } from 'lucide-react';

const MarketingneoChatbot = () => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [conversation, setConversation] = useState([]);

  const cleanResponse = (text) => {
    // Remove markdown asterisks and other special characters
    return text.replace(/[*_~`]/g, '');
  };

  useEffect(() => {
    // Initial greeting
    setResponse(cleanResponse("How may I help you today Nick?"));
  }, []);

  const generateResponse = async (userInput) => {
    try {
      // Include conversation history in messages
      const messages = [
        ...conversation.map(msg => ({ role: msg.role, content: msg.content })),
        { role: "user", content: userInput }
      ];

      const result = await fetch(process.env.REACT_APP_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages }),
      });

      const data = await result.json();
      return cleanResponse(data.response);
    } catch (error) {
      console.error('Error:', error);
      return cleanResponse('Sorry Nick, there was an error processing your request.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    const userInput = input;
    setInput('');
    
    try {
      const aiResponse = await generateResponse(userInput);
      setResponse(aiResponse);
      setConversation([...conversation, 
        { role: 'user', content: userInput },
        { role: 'assistant', content: aiResponse }
      ]);
    } catch (error) {
      console.error('Error:', error);
      setResponse(cleanResponse('Sorry Nick, there was an error processing your request.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([response], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    element.download = `marketingneo_response_${timestamp}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 min-h-screen bg-gradient-to-br from-[#fcd303]/20 via-[#fc0f03]/10 to-white animate-gradient-x">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-[#8a0503] mb-4">Neo Roadrunner</h1>
        <p className="text-[#8a0503] text-xl">Your all-in-one Marketing Assistant</p>
      </div>

      <div className="space-y-6">
        {/* Neo's Response Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border-2 border-[#03befc] p-8 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="font-semibold text-[#fc0f03] mb-4 text-lg">Neo</div>
          <div className="space-y-4">
            {isEditing ? (
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="w-full p-4 border-2 border-[#03befc] rounded-lg focus:ring-2 focus:ring-[#fc0f03] focus:border-transparent bg-[#fcd303]/10 transition-all duration-200 hover:bg-[#fcd303]/20 resize-none"
                rows={8}
              />
            ) : (
              <div className="whitespace-pre-wrap p-6 bg-gradient-to-r from-[#fcd303]/10 to-[#fc0f03]/10 rounded-lg border border-[#03befc] shadow-inner-lg">
                {response}
              </div>
            )}
            
            <div className="flex space-x-4">
              <button
                onClick={isEditing ? handleSaveEdit : handleEdit}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#eb1602] to-[#ebad02] text-white rounded-lg hover:from-[#ebad02] hover:to-[#eb1602] transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {isEditing ? 'Save' : 'Edit'}
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#eb1602] to-[#ebad02] text-white rounded-lg hover:from-[#ebad02] hover:to-[#eb1602] transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
            </div>
          </div>
        </div>

        {/* Nick's Input Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border-2 border-[#03befc] p-8 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <div className="font-semibold text-[#fc0f03] mb-4 text-lg">Nick</div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full p-4 border-2 border-[#03befc] rounded-lg focus:ring-2 focus:ring-[#fc0f03] focus:border-transparent bg-[#fcd303]/10 transition-all duration-200 hover:bg-[#fcd303]/20 resize-none"
              rows={4}
              placeholder="Type your request here..."
            />
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#eb1602] to-[#ebad02] text-white rounded-lg hover:from-[#ebad02] hover:to-[#eb1602] disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Send className="w-4 h-4 mr-2" />
              {isLoading ? 'Processing...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MarketingneoChatbot;
