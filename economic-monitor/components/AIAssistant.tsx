'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, X, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Language-aware quick questions
const quickQuestions = {
  zh: [
    '当前宏观环境如何？',
    '美联储还会降息吗？',
    '现在是经济周期的哪个阶段？',
    '通胀到头了吗？',
  ],
  en: [
    'How is the current economy?',
    'Will the Fed cut rates?',
    'Where are we in the economic cycle?',
    'What does GDP mean?',
  ],
};

export function AIAssistant() {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: language === 'zh'
        ? '你好！我是 Economic AI 助手。你可以问我关于宏观经济、投资策略的问题。'
        : 'Hello! I\'m the Economic AI Assistant. You can ask me about macroeconomics and investment strategies.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const questions = quickQuestions[language];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 调用 AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: language === 'zh'
          ? '抱歉，我遇到了一些问题。你可以尝试重新提问，或者联系支持团队。'
          : 'Sorry, I encountered some issues. You can try asking again, or contact support.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 浮动按钮 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50"
        >
          <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* 聊天窗口 - 响应式宽度 */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 left-0 sm:bottom-6 sm:right-6 sm:w-80 md:w-96 w-full sm:w-full h-[60vh] sm:h-[32rem] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-slate-200 sm:border-0">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 sm:p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-semibold text-sm sm:text-base">Economic AI</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition p-1"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* 快捷问题 */}
          <div className="px-2 sm:px-4 py-2 bg-slate-50 border-b border-slate-100 flex gap-2 overflow-x-auto flex-shrink-0">
            {questions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="flex-shrink-0 px-2 sm:px-3 py-1 text-xs bg-white border border-slate-200 rounded-full hover:border-purple-300 hover:text-purple-600 transition"
              >
                {q}
              </button>
            ))}
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-2 sm:gap-3',
                  msg.role === 'user' && 'flex-row-reverse'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                  )}
                >
                  {msg.role === 'user' ? <User className="w-3 h-3 sm:w-4 sm:h-4" /> : <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />}
                </div>
                <div
                  className={cn(
                    'max-w-[75%] sm:max-w-[80%] rounded-lg sm:rounded-2xl px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm',
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <div className="bg-slate-100 rounded-lg sm:rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2 sm:py-3">
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <div className="p-2 sm:p-4 border-t border-slate-100 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
                placeholder={language === 'zh' ? '输入你的问题...' : 'Ask a question...'}
                className="flex-1 px-3 sm:px-4 py-2 text-sm border border-slate-200 rounded-full focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full flex items-center justify-center hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
