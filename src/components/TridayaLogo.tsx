import React from "react";
import logoImg from "./logo.png";

interface TridayaLogoProps {
  className?: string;
  size?: number | string;
}

export const TridayaLogo: React.FC<TridayaLogoProps> = ({ className = "", size = "100%" }) => {
  return (
    <img
      src={logoImg}
      alt="Tridaya Logo"
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain"
      }}
    />
  );
};

