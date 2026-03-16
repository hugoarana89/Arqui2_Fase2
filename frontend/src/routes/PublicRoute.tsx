import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../utils/authStorage";

const PublicRoutes = ({ children }: any) => {
  return isAuthenticated() ? <Navigate to="/" /> : children;
};

export default PublicRoutes;