import { Link } from "react-router-dom";

import logoImage from "@/assets/barbearia-logo.png";

export default function Logo() {
  return (
    <Link to="/home" className="group inline-flex items-center gap-2 sm:gap-3">
      <img
        src={logoImage}
        alt="Barbearia Freestyle"
        className="h-8 w-8 rounded-md object-contain sm:h-10 sm:w-10 lg:h-12 lg:w-12"
        loading="eager"
        decoding="async"
      />
      <span className="sr-only">Barbearia Freestyle</span>
    </Link>
  );
}
