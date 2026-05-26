import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #4a7fc0 0%, #1e3a5f 100%)',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 210,
            fontWeight: 800,
            fontFamily: 'sans-serif',
            display: 'flex',
            letterSpacing: '-8px',
            paddingLeft: 6,
          }}
        >
          RH
        </div>
      </div>
    ),
    { ...size }
  )
}
