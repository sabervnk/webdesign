import type { Metadata } from 'next';
import './globals.css';
import './public.css';
export const metadata:Metadata={title:'MissMahta — معلم زبان، همراه مسیر تو',description:'پرتفولیوی معلم‌های زبان را ببینید، هزینه کلاس آنلاین و حضوری را مقایسه کنید و نوشته‌های آموزشی معلم‌ها را بخوانید.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl" suppressHydrationWarning><head><link rel="preload" href="/fonts/vazirmatn.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body>{children}</body></html>}
