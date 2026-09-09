import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Escuela 4.0 en el aula · León",description:"Guía para el profesorado de León: recursos, primeros pasos y vinculación curricular LOMLOE para Infantil, Primaria y Secundaria."};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="es"><body>{children}</body></html>}
