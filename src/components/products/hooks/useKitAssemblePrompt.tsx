/**
 * Diálogo reutilizable: tras guardar el BOM de un kit por primera vez,
 * ofrece armar unidades ahora (descuenta materiales de una vez) o dejarlo
 * en modo virtual (descuenta al vender, comportamiento de siempre).
 */
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { fetchProductsAvailability, assembleKitStock } from "@/services/productService";

type PromptState = { productId: string; productName: string; maxQty: number } | null;

export function useKitAssemblePrompt(onResolved: () => void) {
  const { toast } = useToast();
  const [state, setState] = useState<PromptState>(null);
  const [busy, setBusy] = useState(false);

  const offerAssemble = async (productId: string, productName: string): Promise<boolean> => {
    try {
      const availability = await fetchProductsAvailability([productId]);
      const maxQty = availability[productId]?.available ?? 0;
      if (maxQty > 0) {
        setState({ productId, productName, maxQty });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const dismiss = () => {
    if (!state) return;
    setState(null);
    onResolved();
  };

  const confirmAssemble = async () => {
    if (!state) return;
    setBusy(true);
    try {
      const { qty } = await assembleKitStock(state.productId);
      toast({
        title: `${qty} unidades armadas`,
        description: `Se descontaron los materiales de "${state.productName}" de una vez.`,
      });
      setState(null);
      onResolved();
    } catch (e) {
      toast({
        title: "No se pudo armar el kit",
        description: e instanceof Error ? e.message : "Intenta de nuevo",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const promptDialog = (
    <AlertDialog open={state != null} onOpenChange={(o) => !o && dismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Armar el kit ahora?</AlertDialogTitle>
          <AlertDialogDescription>
            Puedes armar {state?.maxQty} unidades de &quot;{state?.productName}&quot; ahora,
            descontando los materiales de una vez del inventario. Si prefieres, los materiales
            se descontarán automáticamente cada vez que vendas el kit.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Descontar al vender</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              void confirmAssemble();
            }}
          >
            {busy ? "Armando…" : `Armar ${state?.maxQty ?? ""} ahora`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { promptDialog, offerAssemble };
}
