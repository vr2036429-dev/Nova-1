import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Bot, 
  User, 
  Volume2, 
  Wrench, 
  ExternalLink, 
  CheckCircle, 
  Sparkles, 
  Radio,
  FileText,
  Smartphone,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Message, ToolResult } from '../types';

interface ChatViewProps {
  messages: Message[];
  isListening: boolean;
  onToggleListening: () => void;
  onSendMessage: (text: string, isVoiceInput?: boolean) => void;
  onReplayAudio: (text: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  isListening,
  onToggleListening,
  onSendMessage,
  onReplayAudio,
}) => {
  const [inputText, setInputText] = useState('');
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), false);
    setInputText('');
  };

  const toggleToolExpand = (id: string) => {
    setExpandedToolId(prev => prev === id ? null : id);
  };

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden p-4 max-w-4xl mx-auto w-full">
      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 font-sans">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mb-3">
              <Bot className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="font-cyber font-bold text-slate-200 text-lg tracking-wider mb-1">
              ULTRON CONVERSATION CORE
            </h3>
            <p className="text-xs font-mono-code max-w-md text-slate-400 leading-relaxed">
              Jarvis assistant is online. Issue voice commands or type questions to begin neural dialogue, automation workflows, or web research.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-start gap-2.5 max-w-[85%]">
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-cyan-400" />
                  </div>
                )}

                <div>
                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-sky-700 text-white rounded-tr-none shadow-md'
                        : 'bg-[#0f172a]/90 text-slate-200 border border-cyan-500/20 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Web Research Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-cyan-500/20">
                        <span className="text-[10px] font-mono-code text-cyan-300 uppercase tracking-wider block mb-1.5">
                          Verified References:
                        </span>
                        <div className="space-y-1">
                          {msg.sources.map((src, i) => (
                            <a
                              key={i}
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-200 underline decoration-cyan-500/40"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{src.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tool Call / Execution Results */}
                    {msg.toolResults && msg.toolResults.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.toolResults.map((tr) => (
                          <div
                            key={tr.toolCallId}
                            className="bg-[#080d1a] border border-cyan-500/30 rounded-xl p-2.5 text-xs font-mono-code"
                          >
                            <div
                              className="flex items-center justify-between cursor-pointer select-none"
                              onClick={() => toggleToolExpand(tr.toolCallId)}
                            >
                              <div className="flex items-center gap-1.5 text-cyan-300">
                                <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="font-semibold">{tr.toolName}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  SUCCESS
                                </span>
                              </div>
                              {expandedToolId === tr.toolCallId ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>

                            <p className="text-slate-300 mt-1">
                              {tr.message}
                            </p>

                            {expandedToolId === tr.toolCallId && tr.data && (
                              <pre className="mt-2 p-2 bg-[#04060a] rounded text-[10px] text-cyan-400/90 overflow-x-auto max-h-36">
                                {JSON.stringify(tr.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Message Meta Info (Time & Voice Replay) */}
                  <div className={`flex items-center gap-2 mt-1 px-1 text-[10px] font-mono-code text-slate-400 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    <span>{msg.timestamp}</span>
                    {msg.isVoiceInput && (
                      <span className="flex items-center gap-1 text-cyan-400">
                        <Mic className="w-2.5 h-2.5" />
                        <span>Voice Transcribed</span>
                      </span>
                    )}
                    {msg.role !== 'user' && (
                      <button
                        onClick={() => onReplayAudio(msg.content)}
                        className="hover:text-cyan-300 flex items-center gap-1"
                        title="Replay Voice Synthesis"
                      >
                        <Volume2 className="w-2.5 h-2.5" />
                        <span>Replay</span>
                      </button>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-sky-900/60 border border-sky-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-sky-300" />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="pt-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-[#090f1d]/90 p-1.5 rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
          <button
            type="button"
            onClick={onToggleListening}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isListening
                ? 'bg-cyan-500 text-slate-950 animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:text-cyan-400'
            }`}
            title={isListening ? 'Stop Voice Listening' : 'Speak into Microphone'}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your command or message to ULTRON..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none font-mono-code"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-40 border border-cyan-500/40 flex items-center justify-center transition-all active:scale-95"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
