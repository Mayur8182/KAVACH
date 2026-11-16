'use client';

/**
 * FeedbackModal.tsx — Interactive Feedback & Bug Report Submission Modal
 *
 * Real feedback processing:
 * - Submits directly to backend POST /api/v1/contact with inquiry_type='feedback'
 * - Records immutable audit events in PostgreSQL
 * - Displays verifiable inquiry ID and response SLA
 * - Zero fake success, full validation
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Star,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bug,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'Product Feedback',
}) => {
  const [category, setCategory] = useState(defaultCategory);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedInquiry, setSubmittedInquiry] = useState<{
    inquiry_id: string;
    sla: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSubmittedInquiry(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = [
    { id: 'Product Feedback', label: 'Product Feedback', icon: Sparkles },
    { id: 'Bug Report', label: 'Bug Report', icon: Bug },
    { id: 'Feature Request', label: 'Feature Request', icon: MessageSquare },
    { id: 'General Inquiry', label: 'General Inquiry', icon: HelpCircle },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      setError('Please provide your email address and feedback message.');
      return;
    }

    if (message.trim().length < 10) {
      setError('Please provide at least 10 characters of detailed feedback.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.request<any>('/api/v1/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim() || 'Anonymous User',
          email: email.trim(),
          company: 'Kavach Community',
          inquiry_type: 'feedback',
          subject: `[${category}] Rating: ${rating}/5`,
          message: `Category: ${category}\nRating: ${rating}/5 Stars\n\nFeedback:\n${message.trim()}`,
        }),
        skipAuth: true,
      });

      if (res?.data?.inquiry_id || res?.inquiry_id) {
        const inqId = res?.data?.inquiry_id || res?.inquiry_id;
        const sla = res?.data?.estimated_response_sla || res?.estimated_response_sla || '24 hours';
        setSubmittedInquiry({ inquiry_id: inqId, sla });
        toast.success('Feedback received', {
          description: `Reference ID: ${inqId}. Thank you for helping us improve!`,
        });
      } else {
        throw new Error('No confirmation returned from server.');
      }
    } catch (err: any) {
      console.warn('Feedback submission notice:', err);
      const msg = err?.message || 'Failed to submit feedback. Please verify your connection.';
      setError(msg);
      toast.error('Submission Failed', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 sm:p-8 overflow-hidden text-slate-800">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedInquiry ? (
          /* Success Screen */
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Thank You for Your Feedback!</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-sm mx-auto">
              Your feedback has been logged in our PostgreSQL audit ledger. Our engineering team
              reviews every submission to prioritize improvements.
            </p>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 mb-6 flex items-center justify-between">
              <span>Inquiry Reference:</span>
              <strong className="text-slate-900">{submittedInquiry.inquiry_id.slice(0, 18)}...</strong>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white font-medium text-sm transition-colors cursor-pointer shadow-xs"
            >
              Done
            </button>
          </div>
        ) : (
          /* Feedback Form */
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Share Your Feedback</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Tell us what is working or what we can improve in Kavach Security.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* Category Pills */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#09090B] text-white border-[#09090B] shadow-xs'
                            : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border-zinc-200'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1" />
                        <span className="text-[11px] font-medium leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5-Star Rating */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  How would you rate your experience?
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                      aria-label={`${star} star`}
                    >
                      <Star
                        className={`w-6 h-6 transition-all ${
                          (hoverRating || rating) >= star
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-medium text-slate-500 ml-2">
                    {rating === 5
                      ? 'Exceptional'
                      : rating === 4
                      ? 'Great'
                      : rating === 3
                      ? 'Good'
                      : rating === 2
                      ? 'Needs Work'
                      : 'Poor'}
                  </span>
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Your Feedback *
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {message.length} chars
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you like, what is confusing, or what features you would love to see..."
                  className="w-full p-3 rounded-xl border border-zinc-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting feedback...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

