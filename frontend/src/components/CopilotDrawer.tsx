import type { RefObject } from 'react';
import { Bot, Send, CheckCircle2, AlertCircle, Lightbulb, HelpCircle, TrendingDown, X, Loader2 } from 'lucide-react';
import type { ChatMessage } from '../types';

interface CopilotDrawerProps {
  messages: ChatMessage[];
  tenantName?: string;
  inputQuery: string;
  isStreaming: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onInputChange: (val: string) => void;
  onSendMessage: (query?: string) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

function parseInline(str: string) {
  const tokens = str.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return tokens.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={idx} className="msg-bold-text">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return <code key={idx} className="msg-inline-code">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={idx} className="msg-italic-text">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function renderFormattedText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, lIndex) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={lIndex} className="msg-spacer" />;
    }
    if (trimmed.startsWith('---')) {
      return <hr key={lIndex} className="msg-divider" />;
    }
    if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
      return (
        <h4 key={lIndex} className="msg-section-header">
          {parseInline(trimmed.replace(/^#{1,4}\s+/, ''))}
        </h4>
      );
    }
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      return (
        <div key={lIndex} className="msg-numbered-item">
          <span className="num-pill">{numMatch[1]}</span>
          <div className="num-content">{parseInline(numMatch[2])}</div>
        </div>
      );
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={lIndex} className="msg-bullet-item">
          <span className="bullet-dot" />
          <div className="bullet-content">{parseInline(trimmed.replace(/^[-*]\s+/, ''))}</div>
        </div>
      );
    }
    return (
      <div key={lIndex} className="msg-formatted-line">
        {parseInline(line)}
      </div>
    );
  });
}

export default function CopilotDrawer({
  messages,
  tenantName = '',
  inputQuery,
  isStreaming,
  isOpen,
  onOpen,
  onClose,
  onInputChange,
  onSendMessage,
  messagesEndRef
}: CopilotDrawerProps) {
  if (!isOpen) {
    return (
      <button className="copilot-floating-btn cortex-copilot-floating-trigger" onClick={onOpen} title="Ask Cortex Copilot">
        <Bot size={22} className="copilot-floating-icon" />
        <span>Ask Copilot</span>
        {messages.length > 1 && (
          <span className="copilot-msg-counter">{messages.length - 1}</span>
        )}
      </button>
    );
  }

  return (
    <aside className="cortex-copilot-drawer overlay-mode">
      <header className="copilot-header">
        <div className="copilot-title">
          <span>Cortex Copilot</span>
          <span className="status-live-pill"><span className="status-dot" /> Live</span>
        </div>
        <button className="copilot-close-btn" onClick={onClose} title="Close Assistant">
          <X size={18} />
        </button>
      </header>

      <div className="copilot-messages">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`message-bubble ${msg.sender === 'user' ? 'message-user' : 'message-assistant'}`}
          >
            <div className="message-content">
              {msg.sender === 'assistant' && (msg.guardStatus === 'RUNNING' || !msg.text || msg.text.startsWith('[EXECUTING')) ? (
                <div className="copilot-thinking-loader">
                  <Loader2 size={16} className="copilot-spin-icon" />
                  <span>Analyzing factory telemetry & billing data...</span>
                </div>
              ) : msg.sender === 'assistant' ? renderFormattedText(msg.text.replace('__ORG_NAME__', tenantName || 'Organization')) : msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="copilot-input-area">
        <div className="suggestion-chips">
          <button className="chip-btn" onClick={() => onSendMessage("Why is my electricity bill higher this month?")}>
            <Lightbulb size={12} /> Why is my bill higher?
          </button>
          <button className="chip-btn" onClick={() => onSendMessage("What caused my Power Factor to drop?")}>
            <TrendingDown size={12} /> Check PF drop
          </button>
          <button className="chip-btn" onClick={() => onSendMessage("How can I reduce energy consumption?")}>
            <TrendingDown size={12} /> Energy saving tips
          </button>
          <button className="chip-btn" onClick={() => onSendMessage("What does this THD value mean?")}>
            <HelpCircle size={12} /> Explain THD value
          </button>
        </div>

        <div className="input-box-row">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask about July telemetry, bills, or equipment..."
            value={inputQuery}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSendMessage()}
          />
          <button
            className="send-btn"
            onClick={() => onSendMessage()}
            disabled={isStreaming || !inputQuery.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
