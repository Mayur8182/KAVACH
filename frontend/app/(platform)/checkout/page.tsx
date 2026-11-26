'use client';

/**
 * Kavach Enterprise — Secure Checkout (/checkout)
 * 
 * Implements Screen 12:
 * - Real Payment details with card inputs
 * - Dynamic Order summary based on selected tier (?plan=pro | team)
 * - Real API integration calling /api/v1/billing/checkout
 * - Real database persistence for plan upgrade and credit grant
 */

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = (searchParams.get('plan') || 'pro').toLowerCase();

  const isTeam = selectedPlan === 'team';
  const planName = isTeam ? 'Team plan' : 'Pro plan';
  const planPrice = isTeam ? '$99.00' : '$29.00';
  const planCredits = isTeam ? '10,000 credits' : '2,000 credits';

  // Form states
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12 / 28');
  const [cvc, setCvc] = useState('•••');
  const [cardName, setCardName] = useState('Mayur Bharvad');
  const [billingEmail, setBillingEmail] = useState('mayur@kavach.io');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const res: any = await api.post('/api/v1/billing/checkout', {
        plan_tier: isTeam ? 'Team' : 'Pro',
        card_name: cardName,
        billing_email: billingEmail,
        card_number: cardNumber,
        exp: expiry,
        cvc: cvc,
      });

      toast.success(res?.message || `Successfully upgraded to ${isTeam ? 'Team' : 'Pro'} plan!`);
      setTimeout(() => {
        router.push('/settings?tab=billing');
      }, 1000);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to process payment');
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px', padding: '12px 0 40px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', margin: 0 }}>
          Secure checkout
        </h1>
        <div style={{ fontSize: '13px', color: '#5B6175', marginTop: '6px' }}>
          Add a card to upgrade to {isTeam ? 'Team' : 'Pro'}.
        </div>
      </div>

      {/* Grid: Payment Details & Order Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Payment Details Card */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '26px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: '0 0 18px 0' }}>
            Payment details
          </h2>

          <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Card Number */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#0F1222' }}>
                Card number
              </label>
              <div
                style={{
                  height: '46px',
                  border: '1px solid #D9DCE6',
                  borderRadius: '10px',
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                }}
              >
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    border: 'none',
                    outline: 'none',
                    width: '80%',
                    color: '#0F1222',
                  }}
                />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#5B6175', letterSpacing: '0.05em' }}>
                  VISA
                </span>
              </div>
            </div>

            {/* Expiry & CVC */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#0F1222' }}>
                  Expiry
                </label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  style={{
                    width: '100%',
                    height: '46px',
                    border: '1px solid #D9DCE6',
                    borderRadius: '10px',
                    padding: '0 14px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    color: '#0F1222',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#0F1222' }}>
                  CVC
                </label>
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  style={{
                    width: '100%',
                    height: '46px',
                    border: '1px solid #D9DCE6',
                    borderRadius: '10px',
                    padding: '0 14px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    color: '#0F1222',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Name on Card */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#0F1222' }}>
                Name on card
              </label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                style={{
                  width: '100%',
                  height: '46px',
                  border: '1px solid #D9DCE6',
                  borderRadius: '10px',
                  padding: '0 14px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  color: '#0F1222',
                  outline: 'none',
                }}
              />
            </div>

            {/* Billing Email */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#0F1222' }}>
                Billing email
              </label>
              <input
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                style={{
                  width: '100%',
                  height: '46px',
                  border: '1px solid #D9DCE6',
                  borderRadius: '10px',
                  padding: '0 14px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  color: '#0F1222',
                  outline: 'none',
                }}
              />
            </div>

            {/* Pay Button */}
            <button
              type="submit"
              disabled={isProcessing}
              style={{
                marginTop: '10px',
                width: '100%',
                height: '46px',
                borderRadius: '10px',
                backgroundColor: '#4F46E5',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: isProcessing ? 0.7 : 1,
              }}
            >
              <Lock size={15} color="#ffffff" />
              {isProcessing ? 'Processing payment...' : `Pay ${planPrice} & upgrade`}
            </button>

            <div style={{ textAlign: 'center', fontSize: '12px', color: '#5B6175', marginTop: '6px' }}>
              Encrypted checkout · Cancel anytime
            </div>
          </form>
        </div>

        {/* Order Summary Card */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: '0 0 16px 0' }}>
            Order summary
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #E6E8EF' }}>
            <div>
              <b style={{ fontSize: '13px', color: '#0F1222' }}>{planName}</b>
              <div style={{ fontSize: '12px', color: '#5B6175' }}>Monthly · {planCredits}</div>
            </div>
            <b style={{ fontSize: '14px', color: '#0F1222' }}>{planPrice}</b>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #E6E8EF', fontSize: '13px' }}>
            <span style={{ color: '#5B6175' }}>Tax</span>
            <span style={{ color: '#0F1222' }}>$0.00</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
            <b style={{ fontSize: '14px', color: '#0F1222' }}>Total today</b>
            <b style={{ fontSize: '20px', color: '#0F1222' }}>{planPrice}</b>
          </div>

          <div
            style={{
              backgroundColor: '#F6F7FB',
              border: '1px solid #E6E8EF',
              borderRadius: '12px',
              padding: '12px 14px',
              marginTop: '8px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#5B6175', lineHeight: '1.4' }}>
              Renews 30 days from purchase. Cancel anytime from Settings → Billing & Plan.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#5B6175' }}>Loading Checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
