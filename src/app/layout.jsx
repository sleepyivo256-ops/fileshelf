import './globals.css';

export const metadata = {
  title: 'FileShelf — Digital Solutions for Everyday Life',
  description: 'Ebooks, courses, notes and templates that solve real-life problems. Pay with MTN MoMo or Airtel Money, download instantly.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('fs_theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t;}catch(e){}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
