import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Test() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>UI Listo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>shadcn/ui funcionando para Legalia.</p>
          <Button>Botón</Button>
        </CardContent>
      </Card>
    </main>
  )
}
