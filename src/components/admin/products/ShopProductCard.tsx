import * as React from "react";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";

import type { ShopProduct } from "@/services/api/productService";
import StockBadge from "@/components/admin/products/StockBadge";
import { Button } from "@/components/ui/button";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function ShopProductCard({
  product,
  onEdit,
  onAdjustStock,
}: {
  product: ShopProduct;
  onEdit: (p: ShopProduct) => void;
  onAdjustStock: (p: ShopProduct) => void;
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Badge de estoque */}
      <div className="absolute right-3 top-3 z-10">
        <StockBadge stock={product.stock} />
      </div>

      {/* Imagem com aspect ratio fixo */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Conteúdo do card */}
      <div className="flex flex-1 flex-col p-4">
        {/* Nome do produto */}
        <h3 className="line-clamp-1 text-sm font-bold text-foreground">{product.name}</h3>
        
        {/* Descrição */}
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs text-muted-foreground">
          {product.description}
        </p>

        {/* Preço e estoque */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-extrabold text-primary">{formatBRL(product.price)}</span>
          <span className="text-xs text-muted-foreground">📦 {product.stock} un.</span>
        </div>

        {/* Botões - sempre no final */}
        <div className="mt-auto flex gap-2 pt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs" 
            onClick={() => onEdit(product)}
          >
            <Pencil className="mr-1 size-3" />
            Editar
          </Button>
          <Button 
            variant="success" 
            size="sm" 
            className="flex-1 text-xs" 
            onClick={() => onAdjustStock(product)}
          >
            + Ajustar estoque
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
