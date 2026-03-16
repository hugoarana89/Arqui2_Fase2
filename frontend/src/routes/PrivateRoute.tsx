import { Navigate } from "react-router-dom";
import { getUser, isAuthenticated } from "../utils/authStorage";

const PrivateRoute = ({ children, roles }: any) => {

  console.log("Checking authentication...");
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  if (roles) {
    const user = getUser();
    if (!roles.includes(user.role)) {
      return <Navigate to="/unauthorized" />;
    }
  }

  return children;
};

export default PrivateRoute;