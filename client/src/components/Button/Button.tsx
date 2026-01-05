import { FC } from "react";
import { ButtonProps } from "./ButtonProps";

const Button: FC<ButtonProps> = ({ 
  skin = "primary", 
  label, 
  children, 
  size = 'base', 
  hasNextSpace, 
  ...props 
}) => (
  <button 
    {...props}
    className={`button ${skin} ${size} ${hasNextSpace ? 'space-after' : ''}`}
  >
    {label || children}
  </button>
);

export default Button;