import React, { forwardRef } from 'react';
import useStore from '../store';

const IntroOverlay = forwardRef((props, ref) => {
  const textColor = useStore((state) => state.textColor);
  const titleColor = useStore((state) => state.titleColor);
  const buttonPrimaryColor = useStore((state) => state.buttonPrimaryColor);

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '12vh 20px 20vh',
        minHeight: '120vh',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          width: 'min(520px, 85vw)',
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          padding: '40px 44px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '48px',
              fontFamily: "'Great Vibes', 'Tangerine', cursive",
              color: titleColor,
              textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7)',
              fontWeight: 400,
              lineHeight: 1.2,
            }}
          >
            Welcome to Puppy Seal
          </h2>
          <div
            style={{
              width: '60px',
              height: '2px',
              background: buttonPrimaryColor,
              margin: '16px auto 0',
              borderRadius: '2px',
              opacity: 0.6,
            }}
          />
        </div>

        <div
          style={{
            color: textColor,
            fontSize: '15px',
            lineHeight: 1.8,
            textShadow: '1px 1px 3px rgba(0, 0, 0, 0.5)',
            opacity: 0.92,
          }}
        >
          <p style={{ margin: '0 0 16px 0' }}>
            Step into a world of imagination, where your favorite characters and
            beloved wildlife come to life through handcrafted digital art.
          </p>

          <h3
            style={{
              color: titleColor,
              fontSize: '18px',
              fontFamily: "'Great Vibes', 'Tangerine', cursive",
              margin: '20px 0 8px 0',
              fontWeight: 400,
            }}
          >
            Cartoon &amp; Anime Characters
          </h3>
          <p style={{ margin: '0 0 12px 0' }}>
            From iconic heroes to original character designs, I specialize in
            capturing personality and emotion in every piece. Whether you want a
            vibrant portrait or a full-scene illustration, your vision takes
            center stage.
          </p>

          <h3
            style={{
              color: titleColor,
              fontSize: '18px',
              fontFamily: "'Great Vibes', 'Tangerine', cursive",
              margin: '20px 0 8px 0',
              fontWeight: 400,
            }}
          >
            Wildlife Art
          </h3>
          <p style={{ margin: '0 0 12px 0' }}>
            Nature&rsquo;s beauty captured in every stroke &mdash; from majestic
            big cats to delicate birds. Each wildlife commission is a celebration
            of the natural world, rendered with attention to detail and heart.
          </p>

          <h3
            style={{
              color: titleColor,
              fontSize: '18px',
              fontFamily: "'Great Vibes', 'Tangerine', cursive",
              margin: '20px 0 8px 0',
              fontWeight: 400,
            }}
          >
            How It Works
          </h3>
          <p style={{ margin: '0 0 12px 0' }}>
            Browse the gallery below, click an artwork to get a closer look, or
            head to the <strong>Commission</strong> link to request your own
            custom piece. Every commission is a collaboration &mdash; I&rsquo;ll
            work with you to bring your idea to life.
          </p>

        </div>
      </div>
    </div>
  );
});

IntroOverlay.displayName = 'IntroOverlay';
export default React.memo(IntroOverlay);
