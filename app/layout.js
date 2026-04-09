export const metadata = {
  title: "Soul Clarity Dashboard",
  description: "Decode your day with neuroscience, yogic science & moon cycles",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#07071a" }}>
        {children}
      </body>
    </html>
  );
}
