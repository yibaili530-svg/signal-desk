import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"Signal — X Content Workspace",description:"Turn project updates and technology conversations into your next meaningful post.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
