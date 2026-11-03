'use client';

import React from 'react';

interface EcosystemIconProps {
  type: string;
  size?: number;
}

export const EcosystemIcon: React.FC<EcosystemIconProps> = ({ type, size = 28 }) => {
  const normType = (type || '').toLowerCase();

  if (normType.includes('npm') || normType.includes('node') || normType === 'npm') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="npm & pnpm logo"
      >
        <rect width="256" height="256" rx="40" fill="#CB3837" />
        <path
          d="M48 64H208V192H128V112H96V192H48V64Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  if (normType.includes('python') || normType.includes('pip') || normType.includes('pypi')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 110 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Python & pip logo"
      >
        <path
          d="M54.7 1C28.4 1 29.8 12.4 29.8 12.4L29.9 24.3H55.4V27.9H20.4C9.5 27.9 1 34.6 1 48.4C1 62.3 8.3 64.9 14.8 64.9H23.5V52.7C23.5 38.8 34.8 38.6 34.8 38.6H59.9C69.4 38.6 74.4 32.7 74.4 24.3C74.4 14.9 70.9 1 54.7 1ZM43.4 8.7C46.3 8.7 48.7 11.1 48.7 14C48.7 16.9 46.3 19.3 43.4 19.3C40.5 19.3 38.1 16.9 38.1 14C38.1 11.1 40.5 8.7 43.4 8.7Z"
          fill="#3776AB"
        />
        <path
          d="M55.3 109C81.6 109 80.2 97.6 80.2 97.6L80.1 85.7H54.6V82.1H89.6C100.5 82.1 109 75.4 109 61.6C109 47.7 101.7 45.1 95.2 45.1H86.5V57.3C86.5 71.2 75.2 71.4 75.2 71.4H50.1C40.6 71.4 35.6 77.3 35.6 85.7C35.6 95.1 39.1 109 55.3 109ZM66.6 101.3C63.7 101.3 61.3 98.9 61.3 96C61.3 93.1 63.7 90.7 66.6 90.7C69.5 90.7 71.9 93.1 71.9 96C71.9 98.9 69.5 101.3 66.6 101.3Z"
          fill="#FFD43B"
        />
      </svg>
    );
  }

  if (normType.includes('java') || normType.includes('maven') || normType.includes('gradle')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Maven & Gradle Java logo"
      >
        <rect width="256" height="256" rx="40" fill="#FFF1F2" />
        <path
          d="M98 190C98 190 85 199 112 204C136 208 171 206 171 206C171 206 182 201 176 195C169 188 155 186 155 186C155 186 181 189 193 181C205 173 194 163 194 163C194 163 176 172 143 173C116 174 98 166 98 166C98 166 122 163 147 154C175 144 191 127 191 127C191 127 185 133 162 141C137 149 105 148 76 173C65 182 82 188 98 190Z"
          fill="#EA580C"
        />
        <path
          d="M142 62C158 84 140 106 140 106C140 106 166 96 157 76C148 56 142 62 142 62Z"
          fill="#DC2626"
        />
        <path
          d="M125 40C125 40 108 64 122 84C133 99 125 111 125 111C125 111 141 97 132 82C123 68 125 40 125 40Z"
          fill="#EA580C"
        />
        <path
          d="M85 220C118 227 167 226 198 217C203 215 200 209 195 210C165 216 119 217 84 213C78 212 79 219 85 220Z"
          fill="#DC2626"
        />
      </svg>
    );
  }

  if (normType.includes('go') || normType.includes('golang')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Go Modules logo"
      >
        <rect width="256" height="256" rx="40" fill="#ECFEFF" />
        <path
          d="M45 130C45 98 68 76 102 76C128 76 145 90 149 109H123C120 101 112 95 101 95C84 95 72 109 72 129C72 149 84 163 102 163C114 163 121 157 124 147H100V130H151V178C139 187 122 192 101 192C66 192 45 168 45 130Z"
          fill="#00ACD7"
        />
        <path
          d="M157 134C157 101 181 76 214 76C247 76 271 101 271 134C271 167 247 192 214 192C181 192 157 167 157 134ZM244 134C244 113 232 95 214 95C196 95 184 113 184 134C184 155 196 173 214 173C232 173 244 155 244 134Z"
          fill="#00ACD7"
          transform="translate(-25, 0)"
        />
      </svg>
    );
  }

  // Cargo & NuGet (Rust / .NET)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cargo & NuGet logo"
    >
      <rect width="256" height="256" rx="40" fill="#FFF7ED" />
      <path
        d="M128 44L208 88V176L128 220L48 176V88L128 44Z"
        fill="#EA580C"
        stroke="#C2410C"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      <path
        d="M128 44V220M48 88L128 132L208 88"
        stroke="#FFF7ED"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="128" cy="132" r="14" fill="#FED7AA" />
    </svg>
  );
};
