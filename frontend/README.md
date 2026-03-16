# 1️⃣ Crear proyecto React (con Vite)

```bash
cd frontend
npm create vite@latest .
```

Selecciona:

```
React
TypeScript  (recomendado)
```

Luego entrar al proyecto:

```bash
npm install
```

Ejecutar proyecto:

```bash
npm run dev
```

---

# 2️⃣ Instalar Tailwind CSS (versión estable)

Instala dependencias:

```bash
npm install -D tailwindcss@3.3.5 postcss autoprefixer
```

Inicializa configuración:

```bash
npx tailwindcss init -p
```

Esto crea:

```
tailwind.config.js
postcss.config.js
```

---

# 3️⃣ Configurar Tailwind

En `tailwind.config.js`:

```js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

---

# 4️⃣ Agregar Tailwind al CSS

En `src/index.css` agrega:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

# 5️⃣ Instalar iconos de Tailwind o Lucide React

Los iconos oficiales vienen de **Heroicons**.

Instalar:

```bash
npm install @heroicons/react
```

Uso ejemplo:

```jsx
import { HomeIcon } from "@heroicons/react/24/solid";

function App() {
  return (
    <div className="p-6">
      <HomeIcon className="w-6 h-6 text-blue-500" />
    </div>
  );
}
```
---

# 6️⃣ Librería de iconos extra

Usar **Lucide React** en lugar de Heroicon porque tiene más iconos.

Instalar:

```bash
npm install lucide-react
```

Ejemplo:

```jsx
import { User } from "lucide-react";

<User className="w-6 h-6 text-gray-700" />
```

---

# 7️⃣ Manejar variables `.env`

React con **Vite **ya tiene soporte integrado**.

Solo crear un archivo:

```
.env
```

Ejemplo:

```env
VITE_API_URL=http://localhost:3000
```

Usarlo en React:

```ts
const api = import.meta.env.VITE_API_URL;
```

⚠️ Importante:
Las variables deben empezar con:

```
VITE_
```

---


# 🚀 Stack final recomendado

El frontend quedaría con:

* ⚛️ React
* ⚡ Vite
* 🎨 Tailwind CSS
* 🎯 Heroicons o Lucide React
* 🔐 `.env` nativo de Vite

---
