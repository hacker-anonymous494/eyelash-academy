export default function BackgroundBlobs({ section = 'hero' }) {
  const configs = {
    hero: [
      { w: 600, h: 600, top: '-15%', left: '-10%', c: 'rgba(248,180,200,0.35)', blur: 80 },
      { w: 500, h: 500, top: '20%', right: '-10%', c: 'rgba(240,168,128,0.25)', blur: 80 },
      { w: 400, h: 400, bottom: '-5%', left: '30%', c: 'rgba(248,128,160,0.2)', blur: 60 },
    ],
    mid: [
      { w: 700, h: 700, top: '0%', right: '-20%', c: 'rgba(248,180,200,0.2)', blur: 100 },
      { w: 500, h: 500, bottom: '0%', left: '-15%', c: 'rgba(240,168,128,0.15)', blur: 80 },
    ],
    dark: [
      { w: 600, h: 600, top: '-20%', left: '20%', c: 'rgba(180,40,80,0.4)', blur: 100 },
      { w: 400, h: 400, bottom: '10%', right: '5%', c: 'rgba(200,80,40,0.3)', blur: 80 },
    ],
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {(configs[section] || configs.hero).map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: b.w,
            height: b.h,
            top: b.top,
            left: b.left,
            right: b.right,
            bottom: b.bottom,
            background: `radial-gradient(circle, ${b.c} 0%, transparent 70%)`,
            filter: `blur(${b.blur}px)`,
          }}
        />
      ))}
    </div>
  );
}