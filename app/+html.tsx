export default function Document({ children }: { children?: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        {/* React Native Web root reset (matches expo-router defaults) */}
        <style
          id="expo-reset"
          dangerouslySetInnerHTML={{ __html: `#root,body,html{height:100%}body{overflow:hidden}#root{display:flex}` }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
