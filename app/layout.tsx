import type { Metadata } from 'next';
import './globals.css';
import './public.css';
export const metadata:Metadata={title:'MahELA — معلم زبان، همراه مسیر تو',description:'پرتفولیوی معلم‌های زبان را ببینید، هزینه کلاس آنلاین و حضوری را مقایسه کنید و نوشته‌های آموزشی معلم‌ها را بخوانید.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl" suppressHydrationWarning><body>{children}</body></html>}
