import React from "react";

interface CurrencyFlagProps {
  code: string;
  size?: number;
  className?: string;
}

export const CurrencyFlag: React.FC<CurrencyFlagProps> = ({
  code,
  size = 24,
  className = "",
}) => {
  const c = code.toUpperCase();

  const renderSvgContent = () => {
    switch (c) {
      case "USD":
        return (
          <>
            <rect width="32" height="32" fill="#B22234" />
            <rect y="4.5" width="32" height="2.4" fill="#FFFFFF" />
            <rect y="9.3" width="32" height="2.4" fill="#FFFFFF" />
            <rect y="14.1" width="32" height="2.4" fill="#FFFFFF" />
            <rect y="18.9" width="32" height="2.4" fill="#FFFFFF" />
            <rect y="23.7" width="32" height="2.4" fill="#FFFFFF" />
            <rect y="28.5" width="32" height="2.4" fill="#FFFFFF" />
            <rect width="15" height="16" fill="#3C3B6E" />
            <circle cx="4" cy="4" r="1" fill="#FFF" />
            <circle cx="8" cy="4" r="1" fill="#FFF" />
            <circle cx="12" cy="4" r="1" fill="#FFF" />
            <circle cx="6" cy="8" r="1" fill="#FFF" />
            <circle cx="10" cy="8" r="1" fill="#FFF" />
            <circle cx="4" cy="12" r="1" fill="#FFF" />
            <circle cx="8" cy="12" r="1" fill="#FFF" />
            <circle cx="12" cy="12" r="1" fill="#FFF" />
          </>
        );
      case "EUR":
        return (
          <>
            <rect width="32" height="32" fill="#003399" />
            <g fill="#FFCC00">
              <circle cx="16" cy="6.5" r="1.3" />
              <circle cx="20.8" cy="7.8" r="1.3" />
              <circle cx="24.2" cy="11.2" r="1.3" />
              <circle cx="25.5" cy="16" r="1.3" />
              <circle cx="24.2" cy="20.8" r="1.3" />
              <circle cx="20.8" cy="24.2" r="1.3" />
              <circle cx="16" cy="25.5" r="1.3" />
              <circle cx="11.2" cy="24.2" r="1.3" />
              <circle cx="7.8" cy="20.8" r="1.3" />
              <circle cx="6.5" cy="16" r="1.3" />
              <circle cx="7.8" cy="11.2" r="1.3" />
              <circle cx="11.2" cy="7.8" r="1.3" />
            </g>
          </>
        );
      case "GBP":
        return (
          <>
            <rect width="32" height="32" fill="#012169" />
            <path d="M0,0 L32,32 M32,0 L0,32" stroke="#FFFFFF" strokeWidth="5.5" />
            <path d="M0,0 L32,32 M32,0 L0,32" stroke="#C8102E" strokeWidth="2.8" />
            <path d="M16,0 V32 M0,16 H32" stroke="#FFFFFF" strokeWidth="8" />
            <path d="M16,0 V32 M0,16 H32" stroke="#C8102E" strokeWidth="4.5" />
          </>
        );
      case "JPY":
        return (
          <>
            <rect width="32" height="32" fill="#FFFFFF" />
            <circle cx="16" cy="16" r="8" fill="#BC002D" />
          </>
        );
      case "CHF":
        return (
          <>
            <rect width="32" height="32" fill="#D52B1E" />
            <rect x="13" y="6.5" width="6" height="19" fill="#FFFFFF" rx="0.8" />
            <rect x="6.5" y="13" width="19" height="6" fill="#FFFFFF" rx="0.8" />
          </>
        );
      case "AUD":
        return (
          <>
            <rect width="32" height="32" fill="#00008B" />
            <rect width="16" height="16" fill="#012169" />
            <path d="M0,0 L16,16 M16,0 L0,16" stroke="#FFFFFF" strokeWidth="2.5" />
            <path d="M8,0 V16 M0,8 H16" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M8,0 V16 M0,8 H16" stroke="#C8102E" strokeWidth="2" />
            <circle cx="24" cy="10" r="1.6" fill="#FFF" />
            <circle cx="21" cy="18" r="1.4" fill="#FFF" />
            <circle cx="26" cy="20" r="1.4" fill="#FFF" />
            <circle cx="23" cy="25" r="1.6" fill="#FFF" />
            <circle cx="8" cy="24" r="2.2" fill="#FFF" />
          </>
        );
      case "NZD":
        return (
          <>
            <rect width="32" height="32" fill="#00247D" />
            <rect width="16" height="16" fill="#012169" />
            <path d="M0,0 L16,16 M16,0 L0,16" stroke="#FFFFFF" strokeWidth="2.5" />
            <path d="M8,0 V16 M0,8 H16" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M8,0 V16 M0,8 H16" stroke="#C8102E" strokeWidth="2" />
            <circle cx="23" cy="9" r="1.8" fill="#CC142B" stroke="#FFF" strokeWidth="0.7" />
            <circle cx="27" cy="15" r="1.6" fill="#CC142B" stroke="#FFF" strokeWidth="0.7" />
            <circle cx="20" cy="16" r="1.6" fill="#CC142B" stroke="#FFF" strokeWidth="0.7" />
            <circle cx="23" cy="24" r="1.9" fill="#CC142B" stroke="#FFF" strokeWidth="0.7" />
          </>
        );
      case "CAD":
        return (
          <>
            <rect width="8" height="32" x="0" fill="#FF0000" />
            <rect width="16" height="32" x="8" fill="#FFFFFF" />
            <rect width="8" height="32" x="24" fill="#FF0000" />
            <path
              d="M16 8 L17.6 12.5 L21 11.5 L19.2 15.2 L22 16.5 L18 18 L18.5 21 L16 19.5 L16 24 L15 24 L15 19.5 L13.5 21 L14 18 L10 16.5 L12.8 15.2 L11 11.5 L14.4 12.5 Z"
              fill="#FF0000"
            />
          </>
        );
      case "BDT":
        return (
          <>
            <rect width="32" height="32" fill="#006A4E" />
            <circle cx="14.5" cy="16" r="7.5" fill="#F42A41" />
          </>
        );
      case "PKR":
        return (
          <>
            <rect width="9" height="32" fill="#FFFFFF" />
            <rect x="9" width="23" height="32" fill="#01411C" />
            <circle cx="20.5" cy="16" r="6.5" fill="#FFFFFF" />
            <circle cx="22.5" cy="14.5" r="5.5" fill="#01411C" />
            <circle cx="23.5" cy="12" r="1.5" fill="#FFFFFF" />
          </>
        );
      case "COP":
        return (
          <>
            <rect width="32" height="16" fill="#FCD116" />
            <rect y="16" width="32" height="8" fill="#003893" />
            <rect y="24" width="32" height="8" fill="#CE1126" />
          </>
        );
      case "PHP":
        return (
          <>
            <rect width="32" height="16" fill="#0038A8" />
            <rect y="16" width="32" height="16" fill="#CE1126" />
            <polygon points="0,0 16,16 0,32" fill="#FFFFFF" />
            <circle cx="6" cy="16" r="3" fill="#FCD116" />
          </>
        );
      case "DZD":
        return (
          <>
            <rect width="16" height="32" fill="#006233" />
            <rect x="16" width="16" height="32" fill="#FFFFFF" />
            <circle cx="16" cy="16" r="6" fill="#D21034" />
            <circle cx="18" cy="16" r="4.8" fill="#FFFFFF" />
            <circle cx="17.5" cy="16" r="1.6" fill="#D21034" />
          </>
        );
      case "ARS":
        return (
          <>
            <rect width="32" height="10.6" fill="#74ACDF" />
            <rect y="10.6" width="32" height="10.8" fill="#FFFFFF" />
            <rect y="21.4" width="32" height="10.6" fill="#74ACDF" />
            <circle cx="16" cy="16" r="3.2" fill="#F6B40E" />
          </>
        );
      case "ZAR":
        return (
          <>
            <rect width="32" height="11" fill="#E03C31" />
            <rect y="21" width="32" height="11" fill="#001489" />
            <rect y="11" width="32" height="10" fill="#FFFFFF" />
            <path d="M0,2 L14,16 L0,30 Z" fill="#000000" stroke="#FFB81C" strokeWidth="2.5" />
            <path d="M0,0 L16,16 H32 M0,32 L16,16" stroke="#007749" strokeWidth="5.5" fill="none" />
          </>
        );
      case "EGP":
        return (
          <>
            <rect width="32" height="10.6" fill="#CE1126" />
            <rect y="10.6" width="32" height="10.8" fill="#FFFFFF" />
            <rect y="21.4" width="32" height="10.6" fill="#000000" />
            <circle cx="16" cy="16" r="2.6" fill="#C09300" />
          </>
        );
      case "CNY":
        return (
          <>
            <rect width="32" height="32" fill="#DE2910" />
            <circle cx="9" cy="10" r="3.2" fill="#FFDE00" />
            <circle cx="15" cy="6" r="1.1" fill="#FFDE00" />
            <circle cx="17" cy="9.5" r="1.1" fill="#FFDE00" />
            <circle cx="17" cy="13.5" r="1.1" fill="#FFDE00" />
            <circle cx="14.5" cy="16" r="1.1" fill="#FFDE00" />
          </>
        );
      case "INR":
        return (
          <>
            <rect width="32" height="10.6" fill="#FF9933" />
            <rect y="10.6" width="32" height="10.8" fill="#FFFFFF" />
            <rect y="21.4" width="32" height="10.6" fill="#138808" />
            <circle cx="16" cy="16" r="3.5" fill="none" stroke="#000080" strokeWidth="1.5" />
          </>
        );
      case "BRL":
        return (
          <>
            <rect width="32" height="32" fill="#009C3B" />
            <polygon points="16,4 28,16 16,28 4,16" fill="#FFDF00" />
            <circle cx="16" cy="16" r="5" fill="#002776" />
          </>
        );
      case "MXN":
        return (
          <>
            <rect width="10.6" height="32" fill="#006847" />
            <rect x="10.6" width="10.8" height="32" fill="#FFFFFF" />
            <rect x="21.4" width="10.6" height="32" fill="#CE1126" />
            <circle cx="16" cy="16" r="2.6" fill="#8B5A2B" />
          </>
        );
      case "TRY":
        return (
          <>
            <rect width="32" height="32" fill="#E30A17" />
            <circle cx="13.5" cy="16" r="6" fill="#FFFFFF" />
            <circle cx="15.3" cy="16" r="4.8" fill="#E30A17" />
            <circle cx="20.5" cy="16" r="2" fill="#FFFFFF" />
          </>
        );
      case "IDR":
        return (
          <>
            <rect width="32" height="16" fill="#FF0000" />
            <rect y="16" width="32" height="16" fill="#FFFFFF" />
          </>
        );
      case "NGN":
        return (
          <>
            <rect width="10.6" height="32" fill="#008751" />
            <rect x="10.6" width="10.8" height="32" fill="#FFFFFF" />
            <rect x="21.4" width="10.6" height="32" fill="#008751" />
          </>
        );
      case "XAU":
        return (
          <>
            <rect width="32" height="32" fill="#1E293B" />
            <circle cx="16" cy="16" r="10" fill="#F59E0B" />
            <text x="16" y="19.5" textAnchor="middle" fill="#451A03" fontSize="9" fontWeight="bold">
              Au
            </text>
          </>
        );
      default:
        return (
          <>
            <rect width="32" height="32" fill="#1E3A8A" />
            <text x="16" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold">
              {c.slice(0, 3)}
            </text>
          </>
        );
    }
  };

  const clipId = `flag-${c}-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`rounded-full shrink-0 ring-1 ring-white/20 overflow-hidden ${className}`}
      aria-label={`${c} flag`}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="16" cy="16" r="16" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{renderSvgContent()}</g>
    </svg>
  );
};

export const PairFlags: React.FC<{ base: string; quote: string; size?: number }> = ({
  base,
  quote,
  size = 24,
}) => {
  return (
    <div className="inline-flex items-center shrink-0">
      <CurrencyFlag code={base} size={size} className="z-10 shadow-sm" />
      <CurrencyFlag
        code={quote}
        size={size}
        className="-ml-2 z-0 shadow-sm"
      />
    </div>
  );
};
