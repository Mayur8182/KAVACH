'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function AssistantMarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  // Split into raw blocks (code blocks vs regular markdown lines)
  const blocks = parseBlocks(content);

  return (
    <div
      className={className}
      style={{
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: '13.5px',
        lineHeight: 1.65,
        color: '#1E293B',
        wordBreak: 'break-word',
      }}
    >
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlock key={idx} language={block.language || 'text'} code={block.text} />;
        }
        return <MarkdownTextBlock key={idx} text={block.text} />;
      })}
    </div>
  );
}

interface Block {
  type: 'text' | 'code';
  text: string;
  language?: string;
}

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split('\n');
  let inCode = false;
  let codeLang = '';
  let codeBuffer: string[] = [];
  let textBuffer: string[] = [];

  const flushText = () => {
    if (textBuffer.length > 0) {
      blocks.push({ type: 'text', text: textBuffer.join('\n') });
      textBuffer = [];
    }
  };

  const flushCode = () => {
    if (codeBuffer.length > 0 || inCode) {
      blocks.push({ type: 'code', text: codeBuffer.join('\n'), language: codeLang });
      codeBuffer = [];
      codeLang = '';
      inCode = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const codeMatch = line.match(/^```([a-zA-Z0-9_\-]+)?/);

    if (codeMatch && !inCode) {
      flushText();
      inCode = true;
      codeLang = codeMatch[1] || '';
    } else if (line.trim().startsWith('```') && inCode) {
      flushCode();
    } else if (inCode) {
      codeBuffer.push(line);
    } else {
      textBuffer.push(line);
    }
  }

  if (inCode) {
    flushCode();
  } else {
    flushText();
  }

  return blocks;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        margin: '12px 0',
        borderRadius: 8,
        border: '1px solid #1E293B',
        backgroundColor: '#0F172A',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 12px',
          backgroundColor: '#1E293B',
          borderBottom: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 11, fontWeight: 600 }}>
          <Terminal size={12} />
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{language || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: 'transparent',
            border: 'none',
            color: copied ? '#4ADE80' : '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 500,
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '12px 14px',
          color: '#F8FAFC',
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
          fontSize: 12.5,
          lineHeight: 1.5,
          overflowX: 'auto',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownTextBlock({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {paragraphs.map((p, pIdx) => {
        const lines = p.split('\n');

        // Check if paragraph is an alert/callout
        const firstLine = lines[0].trim();
        if (firstLine.startsWith('### ')) {
          return (
            <h3
              key={pIdx}
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#0F172A',
                margin: '8px 0 4px',
                letterSpacing: '-0.01em',
              }}
            >
              {renderFormattedInline(firstLine.slice(4))}
            </h3>
          );
        }
        if (firstLine.startsWith('## ')) {
          return (
            <h2
              key={pIdx}
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#0F172A',
                margin: '12px 0 6px',
                letterSpacing: '-0.02em',
              }}
            >
              {renderFormattedInline(firstLine.slice(3))}
            </h2>
          );
        }

        // List check
        const isList = lines.every((l) => l.trim().startsWith('- ') || l.trim().startsWith('* ') || /^\d+\.\s/.test(l.trim()));
        if (isList) {
          return (
            <ul key={pIdx} style={{ margin: '4px 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {lines.map((l, lIdx) => {
                const cleaned = l.trim().replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
                return (
                  <li key={lIdx} style={{ lineHeight: 1.55 }}>
                    {renderFormattedInline(cleaned)}
                  </li>
                );
              })}
            </ul>
          );
        }

        // Regular paragraph with potential list inside
        return (
          <div key={pIdx} style={{ lineHeight: 1.6 }}>
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                  <div key={lineIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginLeft: 8, margin: '2px 0' }}>
                    <span style={{ color: '#2563EB', fontSize: 13, lineHeight: 1.6 }}>•</span>
                    <div>{renderFormattedInline(trimmed.slice(2))}</div>
                  </div>
                );
              }
              return (
                <div key={lineIdx}>
                  {renderFormattedInline(line)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Parses bold (**text**), italics (*text*), inline code (`code`), and markdown links [text](url).
 * Ensures zero asterisks (**) remain in output!
 */
function renderFormattedInline(text: string): React.ReactNode {
  if (!text) return null;

  // 1. Tokenize code spans: `...`
  const codeRegex = /(`[^`]+`)/g;
  const segments = text.split(codeRegex);

  return segments.map((seg, sIdx) => {
    if (!seg) return null;
    if (seg.startsWith('`') && seg.endsWith('`') && seg.length >= 2) {
      return (
        <code
          key={`code-${sIdx}`}
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: '12px',
            backgroundColor: '#F1F5F9',
            border: '1px solid #E2E8F0',
            color: '#0F172A',
            padding: '1.5px 5px',
            borderRadius: 4,
            fontWeight: 500,
          }}
        >
          {seg.slice(1, -1)}
        </code>
      );
    }

    // 2. Tokenize links [label](url) in non-code segment
    const linkRegex = /(\[[^\]]+\]\([^)]+\))/g;
    const linkSegments = seg.split(linkRegex);

    return linkSegments.map((lSeg, lIdx) => {
      if (!lSeg) return null;
      const linkMatch = lSeg.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={`link-${sIdx}-${lIdx}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#2563EB',
              textDecoration: 'underline',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span>{linkMatch[1]}</span>
            <ExternalLink size={10} />
          </a>
        );
      }

      // 3. Tokenize Bold **...** using non-greedy match
      const boldRegex = /(\*\*[\s\S]+?\*\*)/g;
      const boldSegments = lSeg.split(boldRegex);

      return boldSegments.map((bSeg, bIdx) => {
        if (!bSeg) return null;
        if (bSeg.startsWith('**') && bSeg.endsWith('**') && bSeg.length >= 4) {
          const innerBold = bSeg.slice(2, -2).replace(/^\*+|\*+$/g, '');
          return (
            <strong key={`b-${sIdx}-${lIdx}-${bIdx}`} style={{ fontWeight: 700, color: '#0F172A' }}>
              {innerBold}
            </strong>
          );
        }

        // 4. Tokenize Italics *...*
        const italicRegex = /(\*[^\s*][^*]*?\*)/g;
        const italicSegments = bSeg.split(italicRegex);

        return italicSegments.map((iSeg, iIdx) => {
          if (!iSeg) return null;
          if (iSeg.startsWith('*') && iSeg.endsWith('*') && iSeg.length >= 2) {
            return (
              <em key={`i-${sIdx}-${lIdx}-${bIdx}-${iIdx}`} style={{ fontStyle: 'italic', color: '#334155' }}>
                {iSeg.slice(1, -1)}
              </em>
            );
          }

          // Clean any stray dangling double-asterisks from display
          const cleanText = iSeg.replace(/\*\*/g, '');
          return <span key={`txt-${sIdx}-${lIdx}-${bIdx}-${iIdx}`}>{cleanText}</span>;
        });
      });
    });
  });
}
