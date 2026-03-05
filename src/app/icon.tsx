import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

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
          background: '#191C1F',
          color: '#DAA520',
          fontSize: 180,
          fontWeight: 700,
          borderRadius: 80,
          letterSpacing: 2,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        J
      </div>
    ),
    size
  );
}
