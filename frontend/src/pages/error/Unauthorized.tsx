import React from "react";
import { useNavigate } from "react-router-dom";

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 px-6">
      
      <div className="bg-white shadow-xl rounded-2xl p-10 max-w-md w-full text-center">
        
        <div className="text-red-500 text-6xl font-bold mb-4">
          403
        </div>

        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Unauthorized
        </h1>

        <p className="text-gray-500 mb-6">
          You do not have permission to access this page.
        </p>

        <button
          onClick={() => navigate("/")}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition duration-300"
        >
          Go Back Home
        </button>

      </div>

    </div>
  );
};

export default Unauthorized;