'use client';

import React from 'react';
import { BookDemoModal } from './BookDemoModal';

export interface TalkToExpertModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
  initialTopic?: string;
}

/**
 * Enterprise Security Architect Consultation / Walkthrough Modal
 * Renders the clean Cal.com 30-minute walkthrough scheduler identical to /contact.
 */
export const TalkToExpertModal: React.FC<TalkToExpertModalProps> = ({
  isOpen,
  onClose,
  productName,
  initialTopic,
}) => {
  return (
    <BookDemoModal
      isOpen={isOpen}
      onClose={onClose}
      productName={productName}
      initialFocus={initialTopic}
    />
  );
};

export default TalkToExpertModal;
