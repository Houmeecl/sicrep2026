import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold text-primary">404</h1>
      <p className="text-muted-foreground">La página que buscas no existe.</p>
      <Link href="/" className="font-semibold text-primary underline">
        Volver al inicio
      </Link>
    </div>
  );
}
