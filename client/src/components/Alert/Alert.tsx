import { FC } from "react";
import { AlertProps } from "./AlertProps";

const Alert: FC<AlertProps> = ({ skin = 'info', message }) => (
  <div className={`alert alert-${skin}`}>
    {message}
  </div>
);

export default Alert;