import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-3 py-10 sm:px-4 sm:py-12 md:px-6 md:py-16 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="text-sm font-extrabold tracking-[0.16em] text-primary">CONTATO</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <a href="tel:+5515991347226" className="transition-colors hover:text-primary">(15) 99134-7226</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <a href="mailto:guifrestylebarber@gmail.com" className="break-all transition-colors hover:text-primary sm:break-normal">guifrestylebarber@gmail.com</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=Rua+João+Marcolino,+17,+São+Conrado,+Sorocaba,+SP" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Rua João Marcolino, 17<br />São Conrado - Sorocaba/SP<br />CEP: 18076-219
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-extrabold tracking-[0.16em] text-brand-green">HORÁRIOS</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Ter-Sex: 9h às 20h</li>
              <li>Sábado: 8:30h às 21h</li>
              <li>Domingo: Fechado</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-extrabold tracking-[0.16em] text-destructive">SIGA-NOS</h3>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="https://instagram.com/gui.freestyle"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground transition-colors duration-300 hover:text-primary"
                aria-label="Instagram"
              >
                <FaInstagram className="h-5 w-5" />
              </a>
              <a
                href="https://wa.me/5515991347226"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground transition-colors duration-300 hover:text-primary"
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="h-5 w-5" />
              </a>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Tradição e Elegância a cada Corte</p>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 sm:mt-10 sm:pt-8">
          <p className="text-center text-xs text-muted-foreground">
            © 2026 Barbearia Freestyle - Todos os direitos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
