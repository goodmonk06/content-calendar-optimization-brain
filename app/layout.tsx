import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Content Calendar Optimizer',
  description: 'Multi-channel content scheduling and optimization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  )
}
