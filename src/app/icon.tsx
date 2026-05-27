import { ImageResponse } from 'next/og'

export const size = { width: 400, height: 400 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(155deg, #2c5fa8 0%, #1e3a5f 50%, #0e2040 100%)',
          borderRadius: '90px',
        }}
      >
        {/* Person silhouette */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 10 }}>
          {/* Head */}
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)',
            }}
          />
          {/* Shoulders */}
          <div
            style={{
              width: 100,
              height: 50,
              borderRadius: '50px 50px 0 0',
              background: 'rgba(255,255,255,0.92)',
              marginTop: 7,
            }}
          />
        </div>

        {/* Thin separator */}
        <div
          style={{
            width: 56,
            height: 3,
            background: 'rgba(255,255,255,0.25)',
            borderRadius: 2,
            marginBottom: 10,
          }}
        />

        {/* RH text */}
        <div
          style={{
            color: 'white',
            fontSize: 150,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            letterSpacing: '-5px',
            lineHeight: 1,
          }}
        >
          RH
        </div>
      </div>
    ),
    { ...size }
  )
}
