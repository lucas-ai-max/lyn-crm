interface LynLogoProps {
  variant?: "symbol" | "vertical";
  className?: string;
  alt?: string;
  showText?: boolean;
  text?: string;
  textClassName?: string;
}

export const LynLogo = ({
  variant = "symbol",
  className = "",
  alt = "Lyn CRM",
  showText = false,
  text = "Lyn CRM",
  textClassName = ""
}: LynLogoProps) => {

  const logo = (
    <div className={`overflow-hidden rounded-xl ${className}`}>
      <img
        src="/logo-lyn.png"
        alt={alt}
        className="w-full h-full object-cover scale-[1.8]"
      />
    </div>
  );

  if (showText) {
    return (
      <div className="flex items-center gap-2">
        {logo}
        <span className={textClassName}>{text}</span>
      </div>
    );
  }

  return logo;
};
