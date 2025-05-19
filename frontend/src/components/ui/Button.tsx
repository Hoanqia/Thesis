import React from "react";
import clsx from "clsx"; // nếu chưa cài: npm install clsx

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "destructive" | "ghost";
};

export const Button = ({
  children,
  className,
  variant = "default",
  ...props
}: ButtonProps) => {
  const baseClass = "px-4 py-2 rounded text-sm font-medium focus:outline-none";
  const variantClass = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100 border border-gray-300",
  };

  return (
    <button
      {...props}
      className={clsx(baseClass, variantClass[variant], className)}
    >
      {children}
    </button>
  );
};
