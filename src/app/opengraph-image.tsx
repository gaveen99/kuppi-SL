import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Kuppi — Learning platform for Sri Lankan students';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background:
            'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #8b5cf6 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '44px',
              fontWeight: 800,
              color: '#4f46e5',
            }}
          >
            K
          </div>
          <div style={{ fontSize: '40px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Kuppi
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              fontSize: '76px',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              maxWidth: '900px',
            }}
          >
            Free learning for every Sri Lankan student
          </div>
          <div style={{ fontSize: '32px', opacity: 0.85, maxWidth: '900px' }}>
            O/L · A/L · University · Masters — past papers, Z-score, UGC cut-offs, tutors
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '26px',
            opacity: 0.85,
          }}
        >
          <div>your-domain.com</div>
          <div>සිංහල · தமிழ் · English</div>
        </div>
      </div>
    ),
    size
  );
}
