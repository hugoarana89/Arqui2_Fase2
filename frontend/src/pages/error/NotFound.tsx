import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  const goBack = () => {
    navigate("/");
  };

  return (
    <div className="absolute inset-0 w-full h-full flex flex-col justify-center items-center text-center font-['Roboto_Slab',sans-serif] px-4">
      
      <img
        src="https://i.ibb.co/PQzr4Zy/tristeza.png"
        alt="Rocket"
        className="w-[250px] mb-2"
      />

      <h1 className="text-5xl font-bold mb-4">Error 404</h1>

      <p className="text-gray-500 mb-6">
        Lo sentimos 😭, no se pudo cargar el contenido que solicitó.
        <br />
        Por favor regrese a la página de inicio.
      </p>

      <button
        onClick={goBack}
        className="flex items-center bg-[#5cb85c] hover:bg-[#4cae4c] text-white px-6 py-2 rounded-lg transition duration-300"
      >
        <i className="bi bi-arrow-left mr-2"></i>
        Regresar
      </button>
      
    </div>
  );
};

export default NotFound;