export default function Document({ children }: { children?: React.ReactNode }) {
  const themeColor = '#0b5cff';
  return (
    <html lang="pl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        {/* React Native Web root reset (matches expo-router Html) */}
        <style
          id="expo-reset"
          dangerouslySetInnerHTML={{ __html: `#root,body,html{height:100%}body{overflow:hidden}#root{display:flex}` }}
        />

        {/* PWA primary meta */}
        <meta name="theme-color" content={themeColor} />
        <meta name="application-name" content="MangaVerse" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MangaVerse" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />

  {/* Manifest & icons */}
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="apple-touch-icon" href="/icons/apple-icon-180.png" />
  <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                const isLocalhost = Boolean(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                if (window.location.protocol === 'https:' || isLocalhost) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js').catch((e) => console.log('SW registration failed', e));
                  });
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
